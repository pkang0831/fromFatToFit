'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, ReferenceDot } from 'recharts';
import { useThemeColors } from '@/contexts/ThemeContext';

interface BellCurveChartProps {
  mean: number;
  std: number;
  userValue: number;
  percentile: number; // This is "better than" percentage
  unit?: string;
}

export function BellCurveChart({ mean, std, userValue, percentile, unit = '%' }: BellCurveChartProps) {
  const { primary, secondary } = useThemeColors();
  // Generate bell curve data points (inverted X-axis: lower BF% on right)
  const generateBellCurve = () => {
    const points = [];
    const start = mean - 4 * std;
    const end = mean + 4 * std;
    const step = (end - start) / 100;

    for (let x = start; x <= end; x += step) {
      const y = (1 / (std * Math.sqrt(2 * Math.PI))) * 
                Math.exp(-0.5 * Math.pow((x - mean) / std, 2));
      points.push({
        x: x,
        xInverted: end - (x - start), // Invert X-axis
        y: y,
        zone: x < userValue ? 'below' : 'above'
      });
    }
    return points.reverse(); // Reverse array for proper rendering
  };

  const data = generateBellCurve();
  
  // Find the y-value at user's position for the dot
  const userDataPoint = data.find(d => d.x <= userValue) || data[0];

  // Calculate inverted values for display
  const maxBF = mean + 4 * std;
  const minBF = mean - 4 * std;
  const invertValue = (val: number) => maxBF - val + minBF;
  
  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
          <defs>
            <linearGradient id="colorBelow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
            </linearGradient>
            <linearGradient id="colorAbove" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.05}/>
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
          
          <XAxis 
            dataKey="xInverted" 
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(value) => {
              // Show original body fat values
              const originalValue = maxBF - value + minBF;
              return `${originalValue.toFixed(0)}${unit}`;
            }}
            stroke="#64748b"
            style={{ fontSize: '12px' }}
            label={{ 
              value: 'Lower is Better →', 
              position: 'insideBottom', 
              offset: -10,
              style: { fontSize: '11px', fill: '#64748b' }
            }}
          />
          
          <YAxis 
            hide 
          />
          
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
                    <p className="text-sm text-gray-900 dark:text-white">
                      Body Fat: <span className="font-semibold">{payload[0].payload.x.toFixed(1)}{unit}</span>
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          
          {/* Mean line */}
          <ReferenceLine 
            x={invertValue(mean)} 
            stroke="#f59e0b" 
            strokeDasharray="5 5"
            strokeWidth={2}
            label={{ 
              value: `Average: ${mean}${unit}`, 
              position: 'top',
              fill: '#f59e0b',
              fontSize: 12,
              fontWeight: 600
            }}
          />
          
          {/* User position line */}
          <ReferenceLine 
            x={invertValue(userValue)} 
            stroke={secondary} 
            strokeWidth={3}
            label={{ 
              value: `You: ${userValue.toFixed(1)}${unit}`, 
              position: 'top',
              fill: secondary,
              fontSize: 13,
              fontWeight: 700
            }}
          />
          
          {/* User position dot */}
          <ReferenceDot
            x={invertValue(userValue)}
            y={userDataPoint.y}
            r={8}
            fill={secondary}
            stroke="#fff"
            strokeWidth={3}
          />
          
          {/* Bell curve area */}
          <Area 
            type="monotone" 
            dataKey="y" 
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#colorBelow)"
            fillOpacity={1}
          />
        </AreaChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-primary"></div>
          <span className="text-gray-600 dark:text-gray-400">Population Distribution</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-purple-500"></div>
          <span className="text-gray-600 dark:text-gray-400">Your Position</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-amber-500"></div>
          <span className="text-gray-600 dark:text-gray-400">Average</span>
        </div>
      </div>
    </div>
  );
}
