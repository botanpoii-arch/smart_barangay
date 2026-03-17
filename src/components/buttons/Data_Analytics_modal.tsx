import { useRef, useMemo } from 'react';
import { Chart as ChartJS,CategoryScale,LinearScale,PointElement,LineElement,BarElement,ArcElement,Title,Tooltip,Legend,} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ExcelJS from 'exceljs'; // <-- IMPORTED EXCELJS

import './styles/Data_Anaytics_modal.css'; // <-- IMPORTED THE CSS

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

export interface IAnalyticsData {
  id: string;
  type: string;
  dateRequested: string;
  status: string;
  purok?: string; 
  sex?: 'M' | 'F'; 
}

interface AnalyticsProps {
  isOpen: boolean;
  onClose: () => void;
  data: IAnalyticsData[];
}

export default function Data_Analytics_modal({ isOpen, onClose, data }: AnalyticsProps) {
  const reportRef = useRef<HTMLDivElement>(null);

  // --- DATA PROCESSING LOGIC ---
  const { lineChartData, barChartData, doughnutChartData } = useMemo(() => {
    const monthCounts: Record<string, number> = {};
    const purokCounts: Record<string, number> = {};
    let maleCount = 0;
    let femaleCount = 0;

    data.forEach((doc) => {
      // Time tracking
      const date = new Date(doc.dateRequested);
      const month = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      monthCounts[month] = (monthCounts[month] || 0) + 1;

      // Purok tracking
      const purok = doc.purok || 'Unknown Purok';
      purokCounts[purok] = (purokCounts[purok] || 0) + 1;

      // Gender tracking
      if (doc.sex === 'M') maleCount++;
      else if (doc.sex === 'F') femaleCount++;
    });

    return {
      lineChartData: {
        labels: Object.keys(monthCounts),
        datasets: [{
          label: 'Documents Requested',
          data: Object.values(monthCounts),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          tension: 0.3
        }]
      },
      barChartData: {
        labels: Object.keys(purokCounts),
        datasets: [{
          label: 'Requests by Purok',
          data: Object.values(purokCounts),
          backgroundColor: '#10b981',
        }]
      },
      doughnutChartData: {
        labels: ['Male', 'Female', 'Unknown'],
        datasets: [{
          data: [maleCount, femaleCount, data.length - (maleCount + femaleCount)],
          backgroundColor: ['#3b82f6', '#ec4899', '#cbd5e1'],
        }]
      }
    };
  }, [data]);

  // --- PDF EXPORT LOGIC (Visual Dashboard) ---
  const exportPDF = async () => {
    const input = reportRef.current;
    if (!input) return;

    try {
      const canvas = await html2canvas(input, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Barangay_Analytics_Dashboard_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error("PDF Generation failed", err);
      alert("Failed to generate PDF report.");
    }
  };

  // --- EXCEL EXPORT LOGIC (Raw Data) ---
  const exportExcel = async () => {
    if (!data || data.length === 0) return alert("No data to export.");

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Document Analytics');

      // Define Columns
      worksheet.columns = [
        { header: 'Request ID', key: 'id', width: 20 },
        { header: 'Document Type', key: 'type', width: 30 },
        { header: 'Date Requested', key: 'dateRequested', width: 20 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Purok', key: 'purok', width: 20 },
        { header: 'Sex', key: 'sex', width: 10 }
      ];

      // Style Header
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2563EB' } // Barangay Blue
      };

      // Populate Data
      data.forEach(item => {
        worksheet.addRow({
          id: item.id,
          type: item.type,
          dateRequested: new Date(item.dateRequested).toLocaleDateString(),
          status: item.status,
          purok: item.purok || 'Unknown',
          sex: item.sex || 'Unknown'
        });
      });

      // Generate Download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `barangay_Analytics_Data_${new Date().toISOString().split('T')[0]}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Excel Generation failed", err);
      alert("Failed to generate Excel file.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="ANALYTICS_OVERLAY">
      <div className="ANALYTICS_MODAL_CARD">
        
        <div className="ANALYTICS_HEADER">
          <h2>LGU Data Analytics</h2>
          <div className="ANALYTICS_ACTIONS">
            
            {/* NEW EXCEL BUTTON */}
            <button 
              className="ANALYTICS_EXPORT_BTN" 
              onClick={exportExcel}
              style={{ backgroundColor: '#10b981' }} // Emerald Green
            >
              <i className="fas fa-file-excel"></i> Export Raw Data
            </button>
            
            {/* PDF BUTTON */}
            <button 
              className="ANALYTICS_EXPORT_BTN" 
              onClick={exportPDF}
              style={{ backgroundColor: '#ef4444' }} // Red
            >
              <i className="fas fa-file-pdf"></i> Export Dashboard
            </button>

            <button className="ANALYTICS_CLOSE_BTN" onClick={onClose}>&times;</button>
          </div>
        </div>

        {/* This div is what gets converted to the PDF */}
        <div className="ANALYTICS_SCROLL_BODY" ref={reportRef}>
          
          <div className="ANALYTICS_REPORT_HEADER">
            <h3>Barangay Document Issuance Report</h3>
            <p>Generated on: {new Date().toLocaleDateString()}</p>
            <p>Total Records Processed: {data.length}</p>
          </div>

          <div className="ANALYTICS_CHART_GRID">
            {/* TIME SERIES */}
            <div className="ANALYTICS_CHART_CARD WIDE">
              <h4>Request Volume (Over Time)</h4>
              <div className="CHART_WRAPPER_LINE">
                <Line data={lineChartData} options={{ maintainAspectRatio: false }} />
              </div>
            </div>

            {/* PUROK BAR CHART */}
            <div className="ANALYTICS_CHART_CARD">
              <h4>Most Active Puroks</h4>
              <div className="CHART_WRAPPER_BAR">
                <Bar data={barChartData} options={{ maintainAspectRatio: false }} />
              </div>
            </div>

            {/* GENDER DOUGHNUT */}
            <div className="ANALYTICS_CHART_CARD">
              <h4>Demographic Split</h4>
              <div className="CHART_WRAPPER_PIE">
                <Doughnut data={doughnutChartData} options={{ maintainAspectRatio: false }} />
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}