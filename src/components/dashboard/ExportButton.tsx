import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ManagerSummary, AppraisalResponse } from '@/types/appraisal';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';

interface ExportButtonProps {
  managers: ManagerSummary[];
  responses: AppraisalResponse[];
}

// Helper functions for analytics
function calculateCompetencyScores(responses: AppraisalResponse[]) {
  const competencies = [
    { key: 'mentors_coaches_score', name: 'Mentors & Coaches' },
    { key: 'effective_direction_score', name: 'Effective Direction' },
    { key: 'establishes_rapport_score', name: 'Establishes Rapport' },
    { key: 'sets_clear_goals_score', name: 'Sets Clear Goals' },
    { key: 'open_to_ideas_score', name: 'Open to Ideas' },
    { key: 'sense_of_urgency_score', name: 'Sense of Urgency' },
    { key: 'analyzes_change_score', name: 'Analyzes Change' },
    { key: 'confidence_integrity_score', name: 'Confidence & Integrity' },
    { key: 'patient_humble_score', name: 'Patient & Humble' },
    { key: 'flat_collaborative_score', name: 'Flat & Collaborative' },
    { key: 'approachable_score', name: 'Approachable' },
    { key: 'empowers_team_score', name: 'Empowers Team' },
    { key: 'final_say_score', name: 'Final Say Balance' },
  ];

  return competencies.map(c => {
    const scores = responses
      .map(r => r[c.key as keyof AppraisalResponse] as number | null)
      .filter((s): s is number => s !== null);
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const min = scores.length > 0 ? Math.min(...scores) : 0;
    const max = scores.length > 0 ? Math.max(...scores) : 0;
    return {
      name: c.name,
      avg: avg,
      min: min,
      max: max,
      count: scores.length,
      percentage: (avg / 4) * 100,
    };
  });
}

function getRelationshipBreakdown(responses: AppraisalResponse[]) {
  const breakdown: Record<string, number> = {};
  responses.forEach(r => {
    const rel = r.relationship || 'Unknown';
    breakdown[rel] = (breakdown[rel] || 0) + 1;
  });
  return Object.entries(breakdown).map(([name, count]) => ({
    relationship: name,
    count,
    percentage: ((count / responses.length) * 100).toFixed(1),
  }));
}

function getTopAndBottomPerformers(managers: ManagerSummary[], count = 5) {
  const sorted = [...managers].sort((a, b) => b.overall_score - a.overall_score);
  return {
    top: sorted.slice(0, count),
    bottom: sorted.slice(-count).reverse(),
  };
}

function getStrengthsAndWeaknesses(responses: AppraisalResponse[]) {
  const competencies = calculateCompetencyScores(responses);
  const sorted = [...competencies].sort((a, b) => b.avg - a.avg);
  return {
    strengths: sorted.slice(0, 3),
    weaknesses: sorted.slice(-3).reverse(),
  };
}

function collectFeedback(responses: AppraisalResponse[]) {
  const feedback = {
    stopDoing: [] as string[],
    startDoing: [] as string[],
    continueDoing: [] as string[],
    teamLeadership: [] as string[],
    resultsOrientation: [] as string[],
    culturalFit: [] as string[],
  };

  responses.forEach(r => {
    if (r.stop_doing?.trim()) feedback.stopDoing.push(`${r.manager_name}: ${r.stop_doing}`);
    if (r.start_doing?.trim()) feedback.startDoing.push(`${r.manager_name}: ${r.start_doing}`);
    if (r.continue_doing?.trim()) feedback.continueDoing.push(`${r.manager_name}: ${r.continue_doing}`);
    if (r.team_leadership_comments?.trim()) feedback.teamLeadership.push(`${r.manager_name}: ${r.team_leadership_comments}`);
    if (r.results_orientation_comments?.trim()) feedback.resultsOrientation.push(`${r.manager_name}: ${r.results_orientation_comments}`);
    if (r.cultural_fit_comments?.trim()) feedback.culturalFit.push(`${r.manager_name}: ${r.cultural_fit_comments}`);
  });

  return feedback;
}

function getScoreDistribution(managers: ManagerSummary[]) {
  const ranges = [
    { label: 'Exceptional (3.5-4.0)', min: 3.5, max: 4.0 },
    { label: 'Strong (3.0-3.49)', min: 3.0, max: 3.49 },
    { label: 'Developing (2.5-2.99)', min: 2.5, max: 2.99 },
    { label: 'Needs Improvement (2.0-2.49)', min: 2.0, max: 2.49 },
    { label: 'Critical (<2.0)', min: 0, max: 1.99 },
  ];

  return ranges.map(range => ({
    ...range,
    count: managers.filter(m => m.overall_score >= range.min && m.overall_score <= range.max).length,
    managers: managers
      .filter(m => m.overall_score >= range.min && m.overall_score <= range.max)
      .map(m => m.manager_name)
      .join(', '),
  }));
}

export default function ExportButton({ managers, responses }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const exportToExcel = () => {
    setExporting(true);
    
    try {
      const wb = XLSX.utils.book_new();
      
      // ========== Sheet 1: Executive Summary ==========
      const avgOverall = managers.reduce((a, m) => a + m.overall_score, 0) / managers.length;
      const avgTeamLead = managers.reduce((a, m) => a + m.avg_team_leadership, 0) / managers.length;
      const avgResults = managers.reduce((a, m) => a + m.avg_results_orientation, 0) / managers.length;
      const avgCulture = managers.reduce((a, m) => a + m.avg_cultural_fit, 0) / managers.length;
      const { top, bottom } = getTopAndBottomPerformers(managers, 3);
      const { strengths, weaknesses } = getStrengthsAndWeaknesses(responses);

      const execSummary = [
        ['VGG 360° PERFORMANCE ANALYTICS - EXECUTIVE SUMMARY'],
        ['Generated:', new Date().toLocaleString()],
        [''],
        ['KEY METRICS'],
        ['Total Managers Evaluated:', managers.length],
        ['Total Feedback Responses:', responses.length],
        ['Average Responses per Manager:', (responses.length / managers.length).toFixed(1)],
        [''],
        ['OVERALL PERFORMANCE SCORES (out of 4.0)'],
        ['Organization Average:', avgOverall.toFixed(2), `(${((avgOverall/4)*100).toFixed(1)}%)`],
        ['Team Leadership Average:', avgTeamLead.toFixed(2), `(${((avgTeamLead/4)*100).toFixed(1)}%)`],
        ['Results Orientation Average:', avgResults.toFixed(2), `(${((avgResults/4)*100).toFixed(1)}%)`],
        ['Cultural Fit Average:', avgCulture.toFixed(2), `(${((avgCulture/4)*100).toFixed(1)}%)`],
        [''],
        ['TOP 3 PERFORMERS'],
        ...top.map((m, i) => [`${i+1}. ${m.manager_name}`, m.overall_score.toFixed(2), `${((m.overall_score/4)*100).toFixed(1)}%`]),
        [''],
        ['BOTTOM 3 PERFORMERS (Needs Development)'],
        ...bottom.map((m, i) => [`${i+1}. ${m.manager_name}`, m.overall_score.toFixed(2), `${((m.overall_score/4)*100).toFixed(1)}%`]),
        [''],
        ['ORGANIZATIONAL STRENGTHS (Top 3 Competencies)'],
        ...strengths.map((s, i) => [`${i+1}. ${s.name}`, s.avg.toFixed(2), `${s.percentage.toFixed(1)}%`]),
        [''],
        ['AREAS FOR IMPROVEMENT (Bottom 3 Competencies)'],
        ...weaknesses.map((w, i) => [`${i+1}. ${w.name}`, w.avg.toFixed(2), `${w.percentage.toFixed(1)}%`]),
      ];
      const execSheet = XLSX.utils.aoa_to_sheet(execSummary);
      execSheet['!cols'] = [{ wch: 45 }, { wch: 15 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, execSheet, 'Executive Summary');

      // ========== Sheet 2: Manager Rankings ==========
      const rankingData = managers
        .sort((a, b) => b.overall_score - a.overall_score)
        .map((m, i) => ({
          'Rank': i + 1,
          'Manager Name': m.manager_name,
          'Total Reviews': m.total_responses,
          'Team Leadership': m.avg_team_leadership.toFixed(2),
          'Results Orientation': m.avg_results_orientation.toFixed(2),
          'Cultural Fit': m.avg_cultural_fit.toFixed(2),
          'Overall Score': m.overall_score.toFixed(2),
          'Performance %': ((m.overall_score / 4) * 100).toFixed(1) + '%',
          'Performance Tier': m.overall_score >= 3.5 ? 'Exceptional' : 
                             m.overall_score >= 3.0 ? 'Strong' : 
                             m.overall_score >= 2.5 ? 'Developing' : 'Needs Improvement',
          'Gap from Top': (managers[0]?.overall_score - m.overall_score).toFixed(2),
          'Gap from Org Avg': (m.overall_score - avgOverall).toFixed(2),
        }));
      const rankingSheet = XLSX.utils.json_to_sheet(rankingData);
      rankingSheet['!cols'] = [{ wch: 6 }, { wch: 25 }, { wch: 12 }, { wch: 15 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 12 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, rankingSheet, 'Manager Rankings');

      // ========== Sheet 3: Competency Analysis ==========
      const competencyData = calculateCompetencyScores(responses).map((c, i) => ({
        'Rank': i + 1,
        'Competency': c.name,
        'Average Score': c.avg.toFixed(2),
        'Performance %': c.percentage.toFixed(1) + '%',
        'Min Score': c.min.toFixed(2),
        'Max Score': c.max.toFixed(2),
        'Score Range': (c.max - c.min).toFixed(2),
        'Response Count': c.count,
        'Status': c.avg >= 3.5 ? '✓ Strength' : c.avg >= 3.0 ? '○ Good' : c.avg >= 2.5 ? '△ Developing' : '✗ Needs Focus',
      }));
      competencyData.sort((a, b) => parseFloat(b['Average Score']) - parseFloat(a['Average Score']));
      competencyData.forEach((c, i) => c['Rank'] = i + 1);
      const competencySheet = XLSX.utils.json_to_sheet(competencyData);
      competencySheet['!cols'] = [{ wch: 6 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, competencySheet, 'Competency Analysis');

      // ========== Sheet 4: Relationship Breakdown ==========
      const relationshipData = getRelationshipBreakdown(responses);
      const relSheet = XLSX.utils.json_to_sheet(relationshipData.map(r => ({
        'Relationship Type': r.relationship,
        'Response Count': r.count,
        'Percentage': r.percentage + '%',
      })));
      relSheet['!cols'] = [{ wch: 50 }, { wch: 15 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, relSheet, 'Relationship Breakdown');

      // ========== Sheet 5: Score Distribution ==========
      const distData = getScoreDistribution(managers);
      const distSheet = XLSX.utils.json_to_sheet(distData.map(d => ({
        'Performance Tier': d.label,
        'Manager Count': d.count,
        'Percentage': ((d.count / managers.length) * 100).toFixed(1) + '%',
        'Managers': d.managers || 'None',
      })));
      distSheet['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 12 }, { wch: 60 }];
      XLSX.utils.book_append_sheet(wb, distSheet, 'Score Distribution');

      // ========== Sheet 6: Individual Manager Details ==========
      const managerDetails: any[] = [];
      managers.forEach(m => {
        const mResponses = responses.filter(r => r.manager_name === m.manager_name);
        const mCompetencies = calculateCompetencyScores(mResponses);
        const mRelationships = getRelationshipBreakdown(mResponses);
        
        managerDetails.push({
          'Manager Name': m.manager_name,
          'Total Responses': m.total_responses,
          'Overall Score': m.overall_score.toFixed(2),
          'Performance %': ((m.overall_score / 4) * 100).toFixed(1) + '%',
          'Team Leadership': m.avg_team_leadership.toFixed(2),
          'Results Orientation': m.avg_results_orientation.toFixed(2),
          'Cultural Fit': m.avg_cultural_fit.toFixed(2),
          'Strongest Competency': mCompetencies.sort((a, b) => b.avg - a.avg)[0]?.name || 'N/A',
          'Strongest Score': mCompetencies.sort((a, b) => b.avg - a.avg)[0]?.avg.toFixed(2) || 'N/A',
          'Weakest Competency': mCompetencies.sort((a, b) => a.avg - b.avg)[0]?.name || 'N/A',
          'Weakest Score': mCompetencies.sort((a, b) => a.avg - b.avg)[0]?.avg.toFixed(2) || 'N/A',
          'Primary Reviewers': mRelationships.sort((a, b) => b.count - a.count)[0]?.relationship || 'N/A',
          'vs Org Average': (m.overall_score - avgOverall > 0 ? '+' : '') + (m.overall_score - avgOverall).toFixed(2),
        });
      });
      const detailsSheet = XLSX.utils.json_to_sheet(managerDetails);
      detailsSheet['!cols'] = [{ wch: 25 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 15 }, { wch: 18 }, { wch: 12 }, { wch: 22 }, { wch: 14 }, { wch: 22 }, { wch: 14 }, { wch: 35 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, detailsSheet, 'Manager Details');

      // ========== Sheet 7: All Raw Responses ==========
      const responseData = responses.map((r, i) => ({
        '#': i + 1,
        'Timestamp': r.timestamp || '',
        'Manager': r.manager_name,
        'Relationship': r.relationship || '',
        'Mentors/Coaches': r.mentors_coaches_score,
        'Effective Direction': r.effective_direction_score,
        'Establishes Rapport': r.establishes_rapport_score,
        'Clear Goals': r.sets_clear_goals_score,
        'Open to Ideas': r.open_to_ideas_score,
        'Team Leadership Comments': r.team_leadership_comments || '',
        'Sense of Urgency': r.sense_of_urgency_score,
        'Analyzes Change': r.analyzes_change_score,
        'Confidence/Integrity': r.confidence_integrity_score,
        'Results Comments': r.results_orientation_comments || '',
        'Patient/Humble': r.patient_humble_score,
        'Flat Collaborative': r.flat_collaborative_score,
        'Approachable': r.approachable_score,
        'Empowers Team': r.empowers_team_score,
        'Final Say': r.final_say_score,
        'Cultural Fit Comments': r.cultural_fit_comments || '',
        'Stop Doing': r.stop_doing || '',
        'Start Doing': r.start_doing || '',
        'Continue Doing': r.continue_doing || '',
      }));
      const responseSheet = XLSX.utils.json_to_sheet(responseData);
      XLSX.utils.book_append_sheet(wb, responseSheet, 'All Responses');

      // ========== Sheet 8: Qualitative Feedback Summary ==========
      const feedback = collectFeedback(responses);
      const feedbackSummary = [
        ['VGG 360° QUALITATIVE FEEDBACK COMPILATION'],
        [''],
        ['═══════════════════════════════════════════════════════════'],
        ['STOP DOING (Areas for Immediate Attention)'],
        ['═══════════════════════════════════════════════════════════'],
        ...feedback.stopDoing.slice(0, 50).map(f => [f]),
        [''],
        ['═══════════════════════════════════════════════════════════'],
        ['START DOING (Recommended Actions)'],
        ['═══════════════════════════════════════════════════════════'],
        ...feedback.startDoing.slice(0, 50).map(f => [f]),
        [''],
        ['═══════════════════════════════════════════════════════════'],
        ['CONTINUE DOING (Positive Behaviors to Maintain)'],
        ['═══════════════════════════════════════════════════════════'],
        ...feedback.continueDoing.slice(0, 50).map(f => [f]),
      ];
      const feedbackSheet = XLSX.utils.aoa_to_sheet(feedbackSummary);
      feedbackSheet['!cols'] = [{ wch: 120 }];
      XLSX.utils.book_append_sheet(wb, feedbackSheet, 'Qualitative Feedback');

      // ========== Sheet 9: Comments by Category ==========
      const commentsSummary = [
        ['VGG 360° COMMENTS BY CATEGORY'],
        [''],
        ['════════════════════════════════════════'],
        ['TEAM LEADERSHIP COMMENTS'],
        ['════════════════════════════════════════'],
        ...feedback.teamLeadership.slice(0, 40).map(f => [f]),
        [''],
        ['════════════════════════════════════════'],
        ['RESULTS ORIENTATION COMMENTS'],
        ['════════════════════════════════════════'],
        ...feedback.resultsOrientation.slice(0, 40).map(f => [f]),
        [''],
        ['════════════════════════════════════════'],
        ['CULTURAL FIT COMMENTS'],
        ['════════════════════════════════════════'],
        ...feedback.culturalFit.slice(0, 40).map(f => [f]),
      ];
      const commentsSheet = XLSX.utils.aoa_to_sheet(commentsSummary);
      commentsSheet['!cols'] = [{ wch: 120 }];
      XLSX.utils.book_append_sheet(wb, commentsSheet, 'Category Comments');

      XLSX.writeFile(wb, `VGG_360_Analytics_Complete_${new Date().toISOString().split('T')[0]}.xlsx`);
    } finally {
      setExporting(false);
      setIsOpen(false);
    }
  };

  const exportToPDF = () => {
    setExporting(true);
    
    try {
      const doc = new jsPDF();
      let yPos = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;
      const contentWidth = pageWidth - margin * 2;
      
      const avgOverall = managers.reduce((a, m) => a + m.overall_score, 0) / managers.length;
      const avgTeamLead = managers.reduce((a, m) => a + m.avg_team_leadership, 0) / managers.length;
      const avgResults = managers.reduce((a, m) => a + m.avg_results_orientation, 0) / managers.length;
      const avgCulture = managers.reduce((a, m) => a + m.avg_cultural_fit, 0) / managers.length;
      const { top, bottom } = getTopAndBottomPerformers(managers, 5);
      const { strengths, weaknesses } = getStrengthsAndWeaknesses(responses);
      const competencies = calculateCompetencyScores(responses);

      // Helper function for section headers
      const addSectionHeader = (title: string, color: number[] = [20, 80, 80]) => {
        if (yPos > 260) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFillColor(color[0], color[1], color[2]);
        doc.rect(margin, yPos - 5, contentWidth, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(title, margin + 4, yPos + 2);
        doc.setTextColor(40, 40, 40);
        doc.setFont('helvetica', 'normal');
        yPos += 12;
      };

      // ========== Page 1: Cover & Executive Summary ==========
      // Title
      doc.setFillColor(20, 60, 60);
      doc.rect(0, 0, pageWidth, 50, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('VGG 360° Performance Analytics', margin, 30);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Comprehensive Leadership Assessment Report', margin, 42);
      
      yPos = 60;
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPos);
      doc.text(`Report Period: Full Dataset Analysis`, pageWidth - margin - 60, yPos);
      yPos += 15;

      // Key Metrics Box
      doc.setFillColor(245, 247, 250);
      doc.rect(margin, yPos - 5, contentWidth, 35, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.rect(margin, yPos - 5, contentWidth, 35, 'S');
      
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('KEY METRICS AT A GLANCE', margin + 4, yPos + 3);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      
      const metrics = [
        [`Managers Evaluated: ${managers.length}`, `Total Responses: ${responses.length}`],
        [`Avg Responses/Manager: ${(responses.length / managers.length).toFixed(1)}`, `Org Average Score: ${avgOverall.toFixed(2)} (${((avgOverall/4)*100).toFixed(0)}%)`],
      ];
      yPos += 12;
      metrics.forEach(row => {
        doc.text(row[0], margin + 4, yPos);
        doc.text(row[1], margin + contentWidth/2, yPos);
        yPos += 8;
      });
      yPos += 10;

      // Performance Categories Summary
      addSectionHeader('ORGANIZATIONAL PERFORMANCE OVERVIEW');
      
      autoTable(doc, {
        startY: yPos,
        head: [['Category', 'Score', 'Performance', 'Status']],
        body: [
          ['Overall Performance', avgOverall.toFixed(2), `${((avgOverall/4)*100).toFixed(0)}%`, avgOverall >= 3.0 ? 'Strong' : 'Developing'],
          ['Team Leadership', avgTeamLead.toFixed(2), `${((avgTeamLead/4)*100).toFixed(0)}%`, avgTeamLead >= 3.0 ? 'Strong' : 'Developing'],
          ['Results Orientation', avgResults.toFixed(2), `${((avgResults/4)*100).toFixed(0)}%`, avgResults >= 3.0 ? 'Strong' : 'Developing'],
          ['Cultural Fit', avgCulture.toFixed(2), `${((avgCulture/4)*100).toFixed(0)}%`, avgCulture >= 3.0 ? 'Strong' : 'Developing'],
        ],
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: [34, 100, 100], textColor: [255, 255, 255] },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 30, halign: 'center' },
          3: { cellWidth: 35, halign: 'center' },
        },
        margin: { left: margin },
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;

      // ========== Page 2: Manager Rankings ==========
      doc.addPage();
      yPos = 20;
      
      addSectionHeader('TOP 5 PERFORMERS', [34, 139, 87]);
      
      autoTable(doc, {
        startY: yPos,
        head: [['Rank', 'Manager', 'Score', 'Performance', 'Team Lead', 'Results', 'Culture']],
        body: top.map((m, i) => [
          `#${i + 1}`,
          m.manager_name,
          m.overall_score.toFixed(2),
          `${((m.overall_score/4)*100).toFixed(0)}%`,
          m.avg_team_leadership.toFixed(2),
          m.avg_results_orientation.toFixed(2),
          m.avg_cultural_fit.toFixed(2),
        ]),
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: [34, 139, 87], textColor: [255, 255, 255] },
        margin: { left: margin },
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;
      
      addSectionHeader('MANAGERS REQUIRING DEVELOPMENT', [180, 80, 80]);
      
      autoTable(doc, {
        startY: yPos,
        head: [['Rank', 'Manager', 'Score', 'Performance', 'Gap from Avg', 'Priority Focus']],
        body: bottom.map((m, i) => [
          `#${managers.length - 4 + i}`,
          m.manager_name,
          m.overall_score.toFixed(2),
          `${((m.overall_score/4)*100).toFixed(0)}%`,
          (m.overall_score - avgOverall).toFixed(2),
          m.avg_team_leadership < m.avg_results_orientation && m.avg_team_leadership < m.avg_cultural_fit 
            ? 'Team Leadership' 
            : m.avg_results_orientation < m.avg_cultural_fit 
              ? 'Results Orientation' 
              : 'Cultural Fit',
        ]),
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: [180, 80, 80], textColor: [255, 255, 255] },
        margin: { left: margin },
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Complete Manager Ranking
      addSectionHeader('COMPLETE MANAGER RANKINGS');
      
      autoTable(doc, {
        startY: yPos,
        head: [['#', 'Manager', 'Reviews', 'Overall', '%', 'Tier']],
        body: managers
          .sort((a, b) => b.overall_score - a.overall_score)
          .map((m, i) => [
            i + 1,
            m.manager_name,
            m.total_responses,
            m.overall_score.toFixed(2),
            `${((m.overall_score/4)*100).toFixed(0)}%`,
            m.overall_score >= 3.5 ? 'Exceptional' : m.overall_score >= 3.0 ? 'Strong' : m.overall_score >= 2.5 ? 'Developing' : 'Needs Improvement',
          ]),
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [34, 100, 100], textColor: [255, 255, 255] },
        margin: { left: margin },
        didParseCell: (data: any) => {
          if (data.column.index === 5 && data.section === 'body') {
            const tier = data.cell.raw as string;
            if (tier === 'Exceptional') data.cell.styles.textColor = [34, 139, 87];
            else if (tier === 'Strong') data.cell.styles.textColor = [59, 130, 246];
            else if (tier === 'Developing') data.cell.styles.textColor = [234, 179, 8];
            else data.cell.styles.textColor = [220, 38, 38];
          }
        },
      });

      // ========== Page 3: Competency Analysis ==========
      doc.addPage();
      yPos = 20;
      
      addSectionHeader('COMPETENCY PERFORMANCE ANALYSIS');
      
      const sortedCompetencies = [...competencies].sort((a, b) => b.avg - a.avg);
      
      autoTable(doc, {
        startY: yPos,
        head: [['Rank', 'Competency', 'Avg Score', 'Performance', 'Min', 'Max', 'Range', 'Status']],
        body: sortedCompetencies.map((c, i) => [
          i + 1,
          c.name,
          c.avg.toFixed(2),
          `${c.percentage.toFixed(0)}%`,
          c.min.toFixed(2),
          c.max.toFixed(2),
          (c.max - c.min).toFixed(2),
          c.avg >= 3.5 ? 'Strength' : c.avg >= 3.0 ? 'Good' : c.avg >= 2.5 ? 'Developing' : 'Focus Area',
        ]),
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [75, 85, 99], textColor: [255, 255, 255] },
        margin: { left: margin },
        didParseCell: (data: any) => {
          if (data.column.index === 7 && data.section === 'body') {
            const status = data.cell.raw as string;
            if (status === 'Strength') data.cell.styles.textColor = [34, 139, 87];
            else if (status === 'Good') data.cell.styles.textColor = [59, 130, 246];
            else if (status === 'Developing') data.cell.styles.textColor = [234, 179, 8];
            else data.cell.styles.textColor = [220, 38, 38];
          }
        },
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Strengths & Weaknesses Summary
      doc.setFillColor(240, 253, 244);
      doc.rect(margin, yPos, contentWidth / 2 - 5, 45, 'F');
      doc.setFillColor(254, 242, 242);
      doc.rect(margin + contentWidth / 2 + 5, yPos, contentWidth / 2 - 5, 45, 'F');
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(34, 139, 87);
      doc.text('ORGANIZATIONAL STRENGTHS', margin + 4, yPos + 8);
      doc.setTextColor(220, 38, 38);
      doc.text('AREAS FOR IMPROVEMENT', margin + contentWidth / 2 + 9, yPos + 8);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(40, 40, 40);
      
      strengths.forEach((s, i) => {
        doc.text(`${i + 1}. ${s.name}: ${s.avg.toFixed(2)}`, margin + 4, yPos + 18 + i * 8);
      });
      
      weaknesses.forEach((w, i) => {
        doc.text(`${i + 1}. ${w.name}: ${w.avg.toFixed(2)}`, margin + contentWidth / 2 + 9, yPos + 18 + i * 8);
      });

      yPos += 55;

      // Relationship Breakdown
      addSectionHeader('FEEDBACK SOURCE ANALYSIS');
      
      const relationships = getRelationshipBreakdown(responses);
      
      autoTable(doc, {
        startY: yPos,
        head: [['Relationship Type', 'Count', 'Percentage']],
        body: relationships.map(r => [
          r.relationship,
          r.count,
          `${r.percentage}%`,
        ]),
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: [99, 102, 241], textColor: [255, 255, 255] },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { cellWidth: 30, halign: 'center' },
          2: { cellWidth: 30, halign: 'center' },
        },
        margin: { left: margin },
      });

      // ========== Page 4: Score Distribution ==========
      doc.addPage();
      yPos = 20;
      
      addSectionHeader('PERFORMANCE DISTRIBUTION ANALYSIS');
      
      const distribution = getScoreDistribution(managers);
      
      autoTable(doc, {
        startY: yPos,
        head: [['Performance Tier', 'Count', '%', 'Managers']],
        body: distribution.map(d => [
          d.label,
          d.count,
          `${((d.count / managers.length) * 100).toFixed(0)}%`,
          d.managers || 'None',
        ]),
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [139, 92, 246], textColor: [255, 255, 255] },
        columnStyles: {
          0: { cellWidth: 45 },
          1: { cellWidth: 15, halign: 'center' },
          2: { cellWidth: 15, halign: 'center' },
          3: { cellWidth: 105 },
        },
        margin: { left: margin },
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 20;

      // Qualitative Insights
      addSectionHeader('QUALITATIVE FEEDBACK HIGHLIGHTS');
      
      const feedback = collectFeedback(responses);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(220, 38, 38);
      doc.text('STOP DOING (Sample)', margin, yPos);
      yPos += 6;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      feedback.stopDoing.slice(0, 5).forEach(f => {
        const lines = doc.splitTextToSize(f, contentWidth - 10);
        doc.text(lines, margin + 4, yPos);
        yPos += lines.length * 4 + 2;
      });
      
      yPos += 5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(34, 139, 87);
      doc.text('START DOING (Sample)', margin, yPos);
      yPos += 6;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      feedback.startDoing.slice(0, 5).forEach(f => {
        const lines = doc.splitTextToSize(f, contentWidth - 10);
        doc.text(lines, margin + 4, yPos);
        yPos += lines.length * 4 + 2;
      });
      
      yPos += 5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(59, 130, 246);
      doc.text('CONTINUE DOING (Sample)', margin, yPos);
      yPos += 6;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      feedback.continueDoing.slice(0, 5).forEach(f => {
        if (yPos > 270) return;
        const lines = doc.splitTextToSize(f, contentWidth - 10);
        doc.text(lines, margin + 4, yPos);
        yPos += lines.length * 4 + 2;
      });

      // ========== Final Page: Summary & Recommendations ==========
      doc.addPage();
      yPos = 20;
      
      doc.setFillColor(20, 60, 60);
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Executive Summary & Recommendations', margin, 28);
      
      yPos = 55;
      
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(11);
      doc.text('KEY FINDINGS:', margin, yPos);
      yPos += 10;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      
      const findings = [
        `• The organization has ${managers.length} managers with an average performance score of ${avgOverall.toFixed(2)}/4.0 (${((avgOverall/4)*100).toFixed(0)}%)`,
        `• ${distribution[0].count} manager(s) are in the "Exceptional" tier, representing ${((distribution[0].count/managers.length)*100).toFixed(0)}% of leadership`,
        `• Top performer: ${top[0]?.manager_name} with score ${top[0]?.overall_score.toFixed(2)}`,
        `• Organizational strength: "${strengths[0]?.name}" (${strengths[0]?.avg.toFixed(2)}/4.0)`,
        `• Development priority: "${weaknesses[0]?.name}" (${weaknesses[0]?.avg.toFixed(2)}/4.0)`,
        `• Total of ${responses.length} feedback responses collected across all managers`,
      ];
      
      findings.forEach(f => {
        doc.text(f, margin, yPos);
        yPos += 7;
      });
      
      yPos += 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('RECOMMENDATIONS:', margin, yPos);
      yPos += 10;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      
      const recommendations = [
        `1. Focus development resources on improving "${weaknesses[0]?.name}" across the organization`,
        `2. Create mentorship pairing between top performers and those needing development`,
        `3. Leverage organizational strength in "${strengths[0]?.name}" as a best practice model`,
        `4. Develop targeted coaching plans for ${bottom.length} managers requiring immediate attention`,
        `5. Increase feedback frequency to track improvement over time`,
      ];
      
      recommendations.forEach(r => {
        const lines = doc.splitTextToSize(r, contentWidth);
        doc.text(lines, margin, yPos);
        yPos += lines.length * 6 + 3;
      });

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`VGG 360° Performance Analytics Report | Page ${i} of ${pageCount}`, margin, 290);
        doc.text(`Confidential`, pageWidth - margin - 25, 290);
      }

      doc.save(`VGG_360_Analytics_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } finally {
      setExporting(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2"
        disabled={exporting}
      >
        <Download className="w-4 h-4" />
        Export
        <ChevronDown className={cn(
          'w-4 h-4 transition-transform',
          isOpen && 'rotate-180'
        )} />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40"
            />

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-full right-0 mt-2 w-56 glass-card shadow-2xl z-50 p-2"
            >
              <button
                onClick={exportToExcel}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <FileSpreadsheet className="w-5 h-5 text-success" />
                <div className="text-left">
                  <p className="text-sm font-medium">Excel (.xlsx)</p>
                  <p className="text-xs text-muted-foreground">9 sheets, full analytics</p>
                </div>
              </button>
              
              <button
                onClick={exportToPDF}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <FileText className="w-5 h-5 text-destructive" />
                <div className="text-left">
                  <p className="text-sm font-medium">PDF Report</p>
                  <p className="text-xs text-muted-foreground">Executive presentation</p>
                </div>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}