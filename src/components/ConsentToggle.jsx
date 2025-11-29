import React from 'react';

export default function ConsentToggle({ icon: Icon, title, description, enabled, onChange }) {
  return (
    <div
      className={`flex items-center justify-between p-4 rounded-xl border ${
        enabled ? 'border-purple-400 bg-purple-50' : 'border-gray-200'
      }`}
    >
      <div className="flex items-center">
        {Icon && <Icon className="w-6 h-6 text-purple-500 mr-4" />}
        <div>
          <h4 className="text-gray-800 font-semibold">{title}</h4>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" className="sr-only peer" checked={enabled} onChange={onChange} />
        <div className="w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-purple-600 peer-focus:ring-2 peer-focus:ring-purple-400 transition-all"></div>
        <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-all peer-checked:translate-x-5"></div>
      </label>
    </div>
  );
}
