import React from "react";

export default function VaccinationSection() {
  return (
    <div className="bg-gray-100 p-4 rounded-xl space-y-4">
      <h2 className="text-base font-semibold flex items-center space-x-2">
        <span>💉</span>
        <span>Vaccination Records</span>
      </h2>

      <div className="bg-white p-4 rounded-xl shadow space-y-1">
        <p className="font-medium">Rabies Vaccine</p>
        <p className="text-sm text-gray-600">Last: January 10, 2025</p>
        <p className="text-sm text-gray-600">Next: January 10, 2026</p>
        <p className="text-xs text-gray-500">Vet: Dr. Emily Cruz</p>
        <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-md">
          Completed
        </span>
      </div>

      <div className="bg-white p-4 rounded-xl shadow space-y-1">
        <p className="font-medium">DHPP (Distemper)</p>
        <p className="text-sm text-gray-600">Hospital: Pawtanza, Imus</p>
        <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-md">
          Completed
        </span>
      </div>
    </div>
  );
}
