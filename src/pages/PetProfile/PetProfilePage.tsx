import React, { useState } from "react";
import ScheduleSection from "./ScheduleSection";
import VaccinationSection from "./VaccinationSection";
import TasksSection from "./TasksSection";

export default function PetProfilePage() {
  const [activeTab, setActiveTab] = useState<"schedule" | "vaccines" | "tasks">(
    "schedule"
  );

  return (
    <div className="w-full min-h-screen bg-white p-5 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button className="text-xl">←</button>
        <h1 className="text-lg font-semibold">Putu</h1>
        <button className="text-xl">✏️</button>
      </div>

      {/* Pet Info */}
      <div className="flex space-x-4">
        <div className="w-24 h-24 bg-gray-300 rounded-xl" />
        <div className="text-sm space-y-1">
          <p>
            <span className="font-semibold">Pet Name</span>
            <br />
            Putu
          </p>
          <p>
            <span className="font-semibold">Specie & Breed</span>
            <br />
            Dog - Aspin
          </p>
          <p>
            <span className="font-semibold">Color</span> White
          </p>
        </div>
      </div>

      {/* Other Details */}
      <div className="text-sm space-y-2">
        <p>
          <span className="font-semibold">Date of Birth</span>
          <br />
          Sept. 19, 2020
        </p>
        <p>
          <span className="font-semibold">Sex</span> Male
        </p>
        <p>
          <span className="font-semibold">Location</span>
          <br />
          Indang, Cavite
        </p>
        <p>
          <span className="font-semibold">Microchip ID</span>
          <br />
          985112001234567
        </p>
        <p>
          <span className="font-semibold">Owner</span> N/A
        </p>
      </div>

      {/* Tabs */}
      <div className="flex justify-between bg-gray-100 p-2 rounded-xl text-sm font-medium">
        <button
          className={`px-4 py-2 rounded-lg ${
            activeTab === "schedule" ? "bg-white shadow" : ""
          }`}
          onClick={() => setActiveTab("schedule")}
        >
          Schedule
        </button>

        <button
          className={`px-4 py-2 rounded-lg ${
            activeTab === "vaccines" ? "bg-white shadow" : ""
          }`}
          onClick={() => setActiveTab("vaccines")}
        >
          Vaccines
        </button>

        <button
          className={`px-4 py-2 rounded-lg ${
            activeTab === "tasks" ? "bg-white shadow" : ""
          }`}
          onClick={() => setActiveTab("tasks")}
        >
          Tasks
        </button>
      </div>

      {/* Tab Sections */}
      {activeTab === "schedule" && <ScheduleSection />}
      {activeTab === "vaccines" && <VaccinationSection />}
      {activeTab === "tasks" && <TasksSection />}
    </div>
  );
}
