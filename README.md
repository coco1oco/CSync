# CSync – PawPal

Digital Pet Care and Community Management System

CSync (PawPal) is a full-stack web application developed in collaboration with Youth for Animals (YFA) to support responsible pet ownership, campus animal welfare, and organizational coordination.

The system consolidates pet records, health tracking, events, and member interaction into a single platform designed to be reliable, maintainable, and usable under real-world constraints.

---

## Project Overview

Animal welfare organizations often rely on fragmented tools for record-keeping, communication, and coordination. PawPal was built to address these challenges by providing a centralized system that improves consistency, accountability, and visibility across daily operations.

Rather than focusing solely on feature breadth, the project emphasizes:

* clarity of user workflows
* secure and role-based data access
* performance within free-tier infrastructure limits
* practical deployment and maintainability

The application was designed as a production-ready MVP with a clear path for future enhancements.

---

## Key Features

### Pet and Health Management

* Individual profiles for owned pets and campus animals
* Vaccination and medical record tracking
* Consolidated health passport view
* Weight and physical attribute logging

### Routines and Inventory

* Configurable care routines for feeding, medication, and activities
* Inventory-aware routines for consumable supplies
* Manual restocking and supply tracking
* Foundations for low-stock awareness and alerts

### Community and Events

* Organization announcements and posts
* Event creation and member registration
* Member interaction through posts and comments
* Role-based access for administrative features

### Administration and Access Control

* Role-based permissions for members and administrators
* Account moderation and management tools
* Secure data access enforced through database-level policies

---

## Technology Stack

### Frontend

* React (Vite)
* TypeScript
* Tailwind CSS
* TanStack Query for client-side caching and data synchronization

### Backend and Services

* Supabase (PostgreSQL, Authentication, Storage, Row Level Security)
* Cloudinary for media handling and optimization
* Firebase Cloud Messaging for push notifications

### Deployment

* Vercel

---

## Security and Data Handling

* Row Level Security (RLS) is enforced at the database level
* Access to sensitive data is controlled through role-based policies
* Credentials and service keys are managed via environment variables
* Media uploads are handled through managed services to control access and cost

Security decisions were made with the assumption that the system would be used by real users, not only for demonstration purposes.

---

## Deployment and Configuration

The application is deployed using Vercel and configured for production use with Supabase, Cloudinary, and Firebase services.

Environment variables are required for authentication, database access, media handling, and notifications. No sensitive credentials are committed to the repository.

---

## Design and Engineering Considerations

Key considerations during development included:

* working within free-tier infrastructure constraints
* reducing unnecessary network requests through client-side caching
* prioritizing system stability over last-minute refactors
* designing workflows that are understandable to non-technical users

The project intentionally favors clear architecture and predictable behavior over premature optimization.

---

## Planned Improvements

* Improved onboarding and in-app guidance for new users
* Clearer separation between configuration and operational actions (e.g., restocking)
* Media link previews and controlled media expansion
* Administrative audit logs and enhanced moderation safeguards
* Monitoring and performance visibility improvements

These enhancements are planned to be incremental and driven by real usage feedback.

---

## License

This project is currently intended for educational and organizational use.
Licensing terms may be updated as the project evolves.

---

## Author

Developed by CSync
In collaboration with Youth for Animals (YFA)
Cavite State University
