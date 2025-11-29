import React from 'react';

export default function MetricCard({ title, value, trend, note }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
      <h4 className="text-gray-600 text-sm font-medium mb-2">{title}</h4>
      <div className="text-3xl font-bold text-gray-800 mb-2">{value}</div>
      <p className="text-sm text-gray-500">
        {trend && <span className="font-semibold text-green-500 mr-1">{trend}</span>}
        {note}
      </p>
    </div>
  );
}
