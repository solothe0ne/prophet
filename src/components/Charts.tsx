import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const commonOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  plugins: {
    legend: {
      position: 'top',
      labels: {
        color: 'rgb(209, 213, 219)',
        boxWidth: 12,
        padding: 15,
        usePointStyle: true,
      }
    },
    tooltip: {
      backgroundColor: 'rgba(17, 24, 39, 0.8)',
      titleColor: 'rgb(209, 213, 219)',
      bodyColor: 'rgb(209, 213, 219)',
      borderColor: 'rgb(75, 85, 99)',
      borderWidth: 1,
      padding: 10,
      displayColors: true,
      usePointStyle: true,
    },
  },
  scales: {
    x: {
      grid: {
        color: 'rgba(75, 85, 99, 0.2)',
        tickColor: 'rgba(75, 85, 99, 0.2)',
      },
      ticks: {
        color: 'rgb(156, 163, 175)',
      },
    },
    y: {
      grid: {
        color: 'rgba(75, 85, 99, 0.2)',
        tickColor: 'rgba(75, 85, 99, 0.2)',
      },
      ticks: {
        color: 'rgb(156, 163, 175)',
      },
    },
  },
  animations: {
    tension: {
      duration: 1000,
      easing: 'easeOutQuart',
      from: 0.8,
      to: 0.2,
      loop: false
    }
  }
};

export const LineChart: React.FC<{ data: any, options?: any }> = ({ data, options = {} }) => {
  const mergedOptions = {
    ...commonOptions,
    ...options,
  };

  return <Line data={data} options={mergedOptions} />;
};

export const AreaChart: React.FC<{ data: any, options?: any }> = ({ data, options = {} }) => {
  // Modify data to ensure it's an area chart
  const areaData = {
    ...data,
    datasets: data.datasets.map((dataset, index) => ({
      ...dataset,
      fill: dataset.fill === undefined && index === 0 ? 'origin' : dataset.fill,
    })),
  };

  const mergedOptions = {
    ...commonOptions,
    ...options,
  };

  return <Line data={areaData} options={mergedOptions} />;
};

export const Chart: React.FC<{ type: 'line' | 'bar' | 'area', data: any, options?: any }> = ({ 
  type, 
  data, 
  options = {} 
}) => {
  if (type === 'line') {
    return <LineChart data={data} options={options} />;
  } else if (type === 'area') {
    return <AreaChart data={data} options={options} />;
  } else if (type === 'bar') {
    return <Bar data={data} options={{...commonOptions, ...options}} />;
  }
  
  return null;
};