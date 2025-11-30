import React from "react";

export default function ScheduleSection() {
  return (
    <div className="bg-gray-100 p-4 rounded-xl space-y-4">
      <h2 className="text-base font-semibold flex items-center space-x-2">
        <span>📅</span>
        <span>Schedule</span>
      </h2>

      <div className="bg-white p-4 rounded-xl shadow space-y-1">
        <p className="font-medium">Annual Health Checkup</p>
        <p className="text-sm text-gray-600">📆 November 5, 2025</p>
        <p className="text-xs text-gray-500">
          🏥 Happy Paws Veterinary Clinic
        </p>
      </div>

      <div className="bg-white p-4 rounded-xl shadow space-y-1">
        <p className="font-medium">Grooming Appointment</p>
        <p className="text-sm text-gray-600">📆 December 12, 2025</p>
      </div>
    </div>
  );
}
