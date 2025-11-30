import React from "react";

export default function TasksSection() {
  return (
    <div className="bg-gray-100 p-4 rounded-xl space-y-4">
      <h2 className="text-base font-semibold flex items-center space-x-2">
        <span>📋</span>
        <span>Tasks & Reminders</span>
      </h2>

      <div className="bg-white p-4 rounded-xl shadow space-y-2">
        <div className="flex justify-between items-center">
          <p className="font-medium">Give heartworm medication</p>
          <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-md">
            High
          </span>
        </div>
        <p className="text-sm text-gray-600">Monthly dose due today</p>
        <p className="text-xs text-red-500">Requires immediate attention</p>
      </div>

      <div className="bg-white p-4 rounded-xl shadow space-y-2">
        <div className="flex justify-between items-center">
          <p className="font-medium">Refill food supply</p>
          <span className="text-xs bg-yellow-400 text-black px-2 py-1 rounded-md">
            Medium
          </span>
        </div>

        <p className="text-sm text-gray-600">
          Order premium dog food from online store
        </p>
      </div>
    </div>
  );
}
