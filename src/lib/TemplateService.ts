import { supabase } from "./supabaseClient";
import { addDays, addMonths, addYears } from "date-fns";

export const TemplateService = {
  async applyStarterTemplate(petId: string, species: string, userId: string) {
    const today = new Date();
    const tasks = [];
    const vaccines = [];

    // 1. DOG TEMPLATE
    if (species.toLowerCase() === "dog") {
      // Medicines / Prevention
      tasks.push(
        { title: "Heartworm Prevention", description: "Give monthly chewable", due_date: today, priority: "high", urgency: "urgent", owner_id: userId, pet_id: petId },
        { title: "Flea/Tick Meds", description: "Apply topical or pill", due_date: today, priority: "high", urgency: "normal", owner_id: userId, pet_id: petId }
      );
      // Hygiene
      tasks.push(
        { title: "Grooming", description: "Bath & Brush", due_date: addDays(today, 14), priority: "medium", urgency: "normal", owner_id: userId, pet_id: petId }
      );
      // Core Vaccines
      vaccines.push(
        { vaccine_name: "Rabies", next_due_date: addYears(today, 1), status: "pending", owner_id: userId, pet_id: petId },
        { vaccine_name: "DHPP", next_due_date: addYears(today, 1), status: "pending", owner_id: userId, pet_id: petId }
      );
    } 
    
    // 2. CAT TEMPLATE
    else if (species.toLowerCase() === "cat") {
      tasks.push(
        { title: "Flea Prevention", description: "Monthly application", due_date: today, priority: "high", urgency: "normal", owner_id: userId, pet_id: petId },
        { title: "Litter Box Deep Clean", description: "Scrub and replace litter", due_date: addDays(today, 7), priority: "medium", urgency: "normal", owner_id: userId, pet_id: petId }
      );
      vaccines.push(
        { vaccine_name: "FVRCP", next_due_date: addYears(today, 1), status: "pending", owner_id: userId, pet_id: petId },
        { vaccine_name: "Rabies", next_due_date: addYears(today, 1), status: "pending", owner_id: userId, pet_id: petId }
      );
    }

    // 3. Insert Data
    if (tasks.length > 0) await supabase.from("pet_tasks").insert(tasks);
    if (vaccines.length > 0) await supabase.from("vaccinations").insert(vaccines);
  }
};