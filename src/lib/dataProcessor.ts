import * as XLSX from 'xlsx';
import { AppraisalResponse, ManagerSummary, CompetencyScore } from '@/types/appraisal';

// Map text ratings to numeric scores
const ratingToScore: Record<string, number> = {
  'Always': 4,
  'Most times': 3,
  'Sometimes': 2,
  'Never': 1,
  'N/A': 0,
  '4': 4,
  '3': 3,
  '2': 2,
  '1': 1,
};

function parseScore(value: any): number | null {
  if (value === undefined || value === null || value === '') return null;
  const strValue = String(value).trim();
  if (strValue in ratingToScore) {
    return ratingToScore[strValue];
  }
  const numValue = parseInt(strValue);
  if (!isNaN(numValue) && numValue >= 1 && numValue <= 4) {
    return numValue;
  }
  return null;
}

function parseTimestamp(value: any): string | null {
  if (!value) return null;
  try {
    if (typeof value === 'number') {
      // Excel date serial number
      const date = XLSX.SSF.parse_date_code(value);
      return new Date(date.y, date.m - 1, date.d, date.H || 0, date.M || 0, date.S || 0).toISOString();
    }
    return new Date(value).toISOString();
  } catch {
    return null;
  }
}

export async function processExcelData(url: string): Promise<AppraisalResponse[]> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  
  const allResponses: AppraisalResponse[] = [];
  let globalIndex = 1;

  // Process sheets - Page 1 has text ratings, Page 3 has numeric
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    
    if (jsonData.length < 2) continue;
    
    // Skip header row
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || row.length < 3) continue;
      
      const managerName = row[2];
      if (!managerName || typeof managerName !== 'string' || managerName.trim() === '') continue;
      
      const response: AppraisalResponse = {
        id: `${sheetName}-${i}`,
        timestamp: parseTimestamp(row[0]),
        response_number: globalIndex++,
        manager_name: managerName.trim(),
        relationship: row[3] || null,
        mentors_coaches_score: parseScore(row[4]),
        effective_direction_score: parseScore(row[5]),
        establishes_rapport_score: parseScore(row[6]),
        sets_clear_goals_score: parseScore(row[7]),
        open_to_ideas_score: parseScore(row[8]),
        team_leadership_comments: row[9] || null,
        sense_of_urgency_score: parseScore(row[10]),
        analyzes_change_score: parseScore(row[11]),
        confidence_integrity_score: parseScore(row[12]),
        results_orientation_comments: row[13] || null,
        patient_humble_score: parseScore(row[14]),
        flat_collaborative_score: parseScore(row[15]),
        approachable_score: parseScore(row[16]),
        empowers_team_score: parseScore(row[17]),
        final_say_score: parseScore(row[18]),
        cultural_fit_comments: row[19] || null,
        stop_doing: row[20] || null,
        start_doing: row[21] || null,
        continue_doing: row[22] || null,
        created_at: new Date().toISOString(),
      };
      
      // Only add if we have at least one score
      const hasScores = [
        response.mentors_coaches_score,
        response.effective_direction_score,
        response.sense_of_urgency_score,
        response.patient_humble_score
      ].some(s => s !== null);
      
      if (hasScores) {
        allResponses.push(response);
      }
    }
  }
  
  return allResponses;
}

export function calculateManagerSummaries(responses: AppraisalResponse[]): ManagerSummary[] {
  const managerMap = new Map<string, AppraisalResponse[]>();
  
  responses.forEach(response => {
    const name = response.manager_name;
    if (!managerMap.has(name)) {
      managerMap.set(name, []);
    }
    managerMap.get(name)!.push(response);
  });
  
  const summaries: ManagerSummary[] = [];
  
  managerMap.forEach((managerResponses, managerName) => {
    const teamLeadershipScores = managerResponses
      .map(r => [
        r.mentors_coaches_score,
        r.effective_direction_score,
        r.establishes_rapport_score,
        r.sets_clear_goals_score,
        r.open_to_ideas_score
      ].filter(s => s !== null) as number[])
      .flat();
    
    const resultsOrientationScores = managerResponses
      .map(r => [
        r.sense_of_urgency_score,
        r.analyzes_change_score,
        r.confidence_integrity_score
      ].filter(s => s !== null) as number[])
      .flat();
    
    const culturalFitScores = managerResponses
      .map(r => [
        r.patient_humble_score,
        r.flat_collaborative_score,
        r.approachable_score,
        r.empowers_team_score
      ].filter(s => s !== null) as number[])
      .flat();
    
    // For final_say_score, reverse the scale (1 is good, 4 is bad)
    const finalSayScores = managerResponses
      .map(r => r.final_say_score)
      .filter(s => s !== null) as number[];
    const avgFinalSay = finalSayScores.length > 0 
      ? 5 - (finalSayScores.reduce((a, b) => a + b, 0) / finalSayScores.length)
      : 0;
    
    const avgTeamLeadership = teamLeadershipScores.length > 0
      ? teamLeadershipScores.reduce((a, b) => a + b, 0) / teamLeadershipScores.length
      : 0;
    
    const avgResultsOrientation = resultsOrientationScores.length > 0
      ? resultsOrientationScores.reduce((a, b) => a + b, 0) / resultsOrientationScores.length
      : 0;
    
    const avgCulturalFit = culturalFitScores.length > 0
      ? (culturalFitScores.reduce((a, b) => a + b, 0) / culturalFitScores.length + avgFinalSay) / 2
      : 0;
    
    const overallScore = (avgTeamLeadership + avgResultsOrientation + avgCulturalFit) / 3;
    
    summaries.push({
      manager_name: managerName,
      total_responses: managerResponses.length,
      avg_team_leadership: parseFloat(avgTeamLeadership.toFixed(2)),
      avg_results_orientation: parseFloat(avgResultsOrientation.toFixed(2)),
      avg_cultural_fit: parseFloat(avgCulturalFit.toFixed(2)),
      overall_score: parseFloat(overallScore.toFixed(2)),
      responses: managerResponses,
    });
  });
  
  return summaries.sort((a, b) => b.overall_score - a.overall_score);
}

export function getCompetencyBreakdown(responses: AppraisalResponse[]): CompetencyScore[] {
  const competencies = [
    { key: 'mentors_coaches_score', name: 'Mentoring & Coaching' },
    { key: 'effective_direction_score', name: 'Effective Direction' },
    { key: 'establishes_rapport_score', name: 'Establishes Rapport' },
    { key: 'sets_clear_goals_score', name: 'Goal Setting' },
    { key: 'open_to_ideas_score', name: 'Open to Ideas' },
    { key: 'sense_of_urgency_score', name: 'Sense of Urgency' },
    { key: 'analyzes_change_score', name: 'Change Analysis' },
    { key: 'confidence_integrity_score', name: 'Confidence & Integrity' },
    { key: 'patient_humble_score', name: 'Patience & Humility' },
    { key: 'flat_collaborative_score', name: 'Collaborative Culture' },
    { key: 'approachable_score', name: 'Approachability' },
    { key: 'empowers_team_score', name: 'Team Empowerment' },
  ];
  
  return competencies.map(comp => {
    const scores = responses
      .map(r => (r as any)[comp.key])
      .filter(s => s !== null && s !== undefined) as number[];
    
    const avgScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;
    
    return {
      name: comp.name,
      score: parseFloat(avgScore.toFixed(2)),
      maxScore: 4,
      percentage: parseFloat(((avgScore / 4) * 100).toFixed(1)),
    };
  });
}

export function getRelationshipDistribution(responses: AppraisalResponse[]): Record<string, number> {
  const distribution: Record<string, number> = {};
  
  responses.forEach(r => {
    const rel = r.relationship || 'Unknown';
    distribution[rel] = (distribution[rel] || 0) + 1;
  });
  
  return distribution;
}

export function getScoreDistribution(responses: AppraisalResponse[]): Record<number, number> {
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  
  const scoreFields = [
    'mentors_coaches_score', 'effective_direction_score', 'establishes_rapport_score',
    'sets_clear_goals_score', 'open_to_ideas_score', 'sense_of_urgency_score',
    'analyzes_change_score', 'confidence_integrity_score', 'patient_humble_score',
    'flat_collaborative_score', 'approachable_score', 'empowers_team_score'
  ];
  
  responses.forEach(r => {
    scoreFields.forEach(field => {
      const score = (r as any)[field];
      if (score >= 1 && score <= 4) {
        distribution[score]++;
      }
    });
  });
  
  return distribution;
}

export function extractFeedbackThemes(responses: AppraisalResponse[]): {
  stopDoing: string[];
  startDoing: string[];
  continueDoing: string[];
} {
  // Use Sets to deduplicate feedback items
  const stopSet = new Set<string>();
  const startSet = new Set<string>();
  const continueSet = new Set<string>();
  
  responses.forEach(r => {
    if (r.stop_doing) {
      const trimmed = r.stop_doing.trim();
      if (trimmed && !stopSet.has(trimmed.toLowerCase())) {
        stopSet.add(trimmed.toLowerCase());
      }
    }
    if (r.start_doing) {
      const trimmed = r.start_doing.trim();
      if (trimmed && !startSet.has(trimmed.toLowerCase())) {
        startSet.add(trimmed.toLowerCase());
      }
    }
    if (r.continue_doing) {
      const trimmed = r.continue_doing.trim();
      if (trimmed && !continueSet.has(trimmed.toLowerCase())) {
        continueSet.add(trimmed.toLowerCase());
      }
    }
  });
  
  // Convert back to arrays with original casing (get first occurrence)
  const getUniqueItems = (responses: AppraisalResponse[], field: 'stop_doing' | 'start_doing' | 'continue_doing'): string[] => {
    const seen = new Set<string>();
    const result: string[] = [];
    responses.forEach(r => {
      const value = r[field];
      if (value) {
        const trimmed = value.trim();
        const key = trimmed.toLowerCase();
        if (trimmed && !seen.has(key)) {
          seen.add(key);
          result.push(trimmed);
        }
      }
    });
    return result;
  };
  
  return {
    stopDoing: getUniqueItems(responses, 'stop_doing'),
    startDoing: getUniqueItems(responses, 'start_doing'),
    continueDoing: getUniqueItems(responses, 'continue_doing'),
  };
}