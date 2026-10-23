# Lean Gains Compass

FITTRACK — COMPLETE MVP WEB APPLICATION DEVELOPMENT PROMPT

1. PROJECT OVERVIEW

You are a Senior Full-Stack Software Engineer, Software Architect, UI/UX Designer, Database Engineer, and Quality Assurance Engineer.

Your task is to design, develop, test, and prepare for deployment a complete, production-quality, mobile-first Progressive Web Application (PWA) named FitTrack.

FitTrack is a personal fitness, nutrition, and body progress management application designed primarily for people who want to gain weight, build muscle, track workouts, monitor nutritional intake, and measure their physical progress.

The application must prioritize the Minimum Viable Product (MVP), delivering a complete and reliable core experience before implementing advanced or optional features.

Core principle: Build fewer features completely rather than many features partially.

Every MVP module must have functional interfaces, persistent database storage, proper validation, loading states, error handling, and integration with other relevant modules.

Do not create decorative interfaces with nonfunctional buttons, fake charts, or hardcoded user statistics.

2. PROJECT IDENTITY

Application Name: FitTrack

Application Type: Personal Fitness and Nutrition Progress Tracking System

Platform: Responsive Web Application and Progressive Web Application

Primary Users: Individuals tracking weight gain, muscle development, home workouts, and nutrition.

Initial Deployment: Single personal user, with architecture supporting multiple accounts in the future.

Primary Fitness Goal: Lean bulking and gradual muscle development.

Design Direction: Premium dark-mode fitness dashboard with modern UI/UX principles.

Default Currency: Philippine Peso (PHP / ₱)

Default Measurement Units:

Weight: kilograms (kg)

Height: centimeters (cm)

Food: grams (g), milliliters (mL), and servings

Energy: kilocalories (kcal)

Exercise weight: kilograms (kg)

Default Time Zone: Asia/Manila

Primary Language: English

3. DEVELOPMENT OBJECTIVES

The MVP must allow a registered user to:

Create an account and securely log in.

Complete an initial fitness profile.

Set and update fitness goals.

View a personalized dashboard.

Record body weight and monitor progress.

Create and manage workout routines.

Track exercises, sets, repetitions, and dumbbell weights.

Log daily food consumption.

Monitor calories and macronutrients.

View historical workout and nutrition records.

Analyze progress through interactive charts.

Manage personal preferences.

Access the application through desktop and mobile browsers.

Install the application as a PWA where supported.

Securely access only their own information.

All these functions must work together using persistent data.

4. RECOMMENDED TECHNOLOGY STACK

Frontend

React

TypeScript

Vite

Tailwind CSS

shadcn/ui

Radix UI

Lucide React

React Router

TanStack Query

React Hook Form

Zod

Recharts

date-fns

Zustand, only when shared client-side state is necessary

Backend

Use Supabase for:

PostgreSQL database

Authentication

Row Level Security

Storage when required

Edge Functions for privileged server-side operations when required

PWA

vite-plugin-pwa

Web App Manifest

Service Worker for application assets

Installable application experience

Offline data synchronization is not part of the initial MVP. Do not advertise offline logging until it is implemented.

Hosting and Deployment

GitHub for version control

Vercel for frontend deployment

Supabase for backend infrastructure

Animation

Use lightweight CSS animations and transitions for the MVP.

GSAP may be added later for complex animations. Avoid unnecessary animation libraries that increase bundle size without improving the experience.

5. APPLICATION DESIGN SYSTEM

Follow the supplied FitTrack design reference.

The application should look like a premium modern fitness application with a clean, professional, visually consistent interface.

5.1 Color Palette

Use these design tokens:

Primary background: #07111F

Secondary background: #0D1B2A

Card background: #122438

Elevated surface: #172D42

Primary accent: #22E58A

Primary accent hover: #16C777

Primary text: #F8FAFC

Secondary text: #94A3B8

Border: #24384D

Information: #38BDF8

Warning: #F59E0B

Error: #EF4444

Success: #22C55E

Use colors semantically and consistently.

Do not rely on color alone to communicate important information.

5.2 Typography

Use Inter or a similar modern sans-serif font.

Establish a consistent typography hierarchy:

Page titles: 24–30px

Section headings: 18–22px

Card titles: 14–18px

Body text: 14–16px

Supporting labels: 12–14px

Main dashboard statistics: 28–36px

Maintain readable contrast and appropriate line spacing.

5.3 UI/UX Principles

Apply:

Jakob's Law

Hick's Law

Fitts's Law

Miller's Law

Gestalt Principles

Visual Hierarchy

Consistency and Standards

Recognition Rather Than Recall

Progressive Disclosure

Accessibility and Inclusive Design

Mobile-First Responsive Design

Design important actions to be easy to find and perform.

Use clear navigation, concise labels, meaningful feedback, and consistent layouts.

5.4 Components

Build reusable components including:

Application Shell

Desktop Sidebar

Mobile Bottom Navigation

Top Navigation Bar

Page Header

Statistic Card

Progress Ring

Progress Bar

Metric Chart

Workout Card

Exercise Card

Food Card

Goal Card

Empty State

Loading Skeleton

Confirmation Dialog

Form Dialog

Toast Notification

Date Selector

Number Input

Search Input

Filter Controls

Responsive Data Table

Floating Action Button where appropriate

Avoid duplicating component code.

5.5 Navigation

Mobile navigation:

Home

Workouts

Nutrition

Progress

More

Use a fixed bottom navigation bar on mobile with safe-area padding.

Desktop navigation:

Use a collapsible sidebar with grouped navigation items.

Keep the primary navigation consistent across pages.

6. USER ROLES AND ACCESS CONTROL

MVP Role

Personal User

The personal user can:

Manage their own fitness profile.

Set personal goals.

Log weight measurements.

Create workout plans.

Record workouts.

Log food consumption.

View analytics.

Manage account preferences.

Delete their own records.

No administrator dashboard is required for the MVP.

Security Requirements

Every private database record must belong to an authenticated user.

Implement Supabase Row Level Security policies.

Users must only be able to create, read, update, and delete records belonging to their own accounts.

Do not rely solely on frontend route guards for security.

Never expose Supabase service-role credentials in the browser.

7. MVP MODULE 1 — AUTHENTICATION AND ONBOARDING

7.1 Authentication Screens

Create:

Login Page

Registration Page

Forgot Password Page

Reset Password Page

Registration

Fields:

Full name

Email address

Password

Confirm password

Requirements:

Input validation

Password confirmation

Secure Supabase Auth integration

Email verification if enabled

Duplicate account handling

Loading states

Error messages

Success feedback

Login

Features:

Email and password authentication

Session persistence

Logout functionality

Protected routes

Automatic session restoration

Proper expired-session handling

7.2 Onboarding Wizard

After first login, guide the user through onboarding.

Step 1 — Welcome

Display the FitTrack identity, a brief introduction, and a Get Started button.

Step 2 — Personal Information

Collect:

Name

Age or date of birth

Height

Current weight

Sex, optional, for improving calorie estimates

Activity level

Step 3 — Fitness Goal

Allow users to choose:

Gain Weight

Build Muscle

Maintain Weight

Lose Weight

The initial implementation should optimize the experience for weight gain and muscle building.

Step 4 — Goal Configuration

Collect:

Starting weight

Target weight

Desired weekly weight change

Daily calorie target

Daily protein target

Provide suggested calorie and protein targets, but allow manual adjustments.

Explain that suggested values are estimates and not medical prescriptions.

Step 5 — Workout Preferences

Collect:

Workout location

Available equipment

Preferred training days

Fitness experience level

Initial equipment choices:

Bodyweight

Dumbbells

Resistance Bands

Other

Step 6 — Completion

Save all onboarding data.

Redirect the user to the dashboard.

Do not show onboarding again unless the user chooses to edit their profile or reset onboarding.

8. MVP MODULE 2 — PERSONAL DASHBOARD

Route: /dashboard

The dashboard is the application's primary landing page after authentication.

It must provide a concise overview of the user's current fitness progress.

8.1 Welcome Header

Display:

Personalized greeting

Current date

User's name

Current goal

Profile avatar or initials

8.2 Weight Progress Card

Display:

Starting weight

Latest recorded weight

Target weight

Total weight change

Progress toward the target

Example:

Starting Weight: 48 kg

Current Weight: 49 kg

Target Weight: 55 kg

Weight Gained: +1 kg

Progress must be calculated from actual saved records.

8.3 Nutrition Overview

Display:

Calories consumed today

Daily calorie target

Protein consumed today

Daily protein target

Use visual progress indicators.

Example:

Calories: 1,450 / 2,100 kcal

Protein: 62 / 95 g

Do not count planned meals as consumed meals.

8.4 Today's Workout

Display:

Scheduled workout

Workout title

Number of exercises

Workout completion status

Start Workout action

If no workout is scheduled, show an appropriate empty state.

8.5 Weight Trend Chart

Display recent weight measurements.

Support:

7 days

30 days

90 days

Use actual historical measurements.

8.6 Quick Actions

Provide:

Log Weight

Start Workout

Log Meal

View Progress

8.7 Daily Summary

Display:

Nutrition completion

Workout status

Latest weight

Weekly workout count

The dashboard must update after relevant records are created or changed.

9. MVP MODULE 3 — BODY WEIGHT AND GOAL TRACKING

Routes:

/progress

/progress/weight

/progress/goals

9.1 Weight Logging

Allow the user to record:

Weight in kilograms

Measurement date

Measurement time, optional

Notes, optional

Features:

Add weight entry

Edit weight entry

Delete weight entry

View weight history

Sort records by date

Filter by date range

Validate weight values and dates.

9.2 Weight Progress Chart

Create an interactive line chart.

Display:

Weight over time

Starting weight

Current weight

Target weight

Weight change

Trend over selected period

Support:

Weekly view

Monthly view

Three-month view

All-time view

Handle missing dates without inventing measurements.

9.3 Goal Management

Allow the user to:

Set target weight

Edit target weight

Set weekly weight gain goal

Set daily calorie goal

Set daily protein goal

View goal progress

9.4 Progress Calculations

Calculate:

Weight Change = Latest Weight − Starting Weight

Goal Difference = Target Weight − Latest Weight

Goal Progress = (Latest Weight − Starting Weight) / (Target Weight − Starting Weight) × 100

Handle zero denominators, reversed goals, and weight-loss goals safely.

Do not treat BMI as a measurement of muscle mass or body-fat percentage.

9.5 Goal Status

Display meaningful statuses such as:

Goal Not Started

Progressing

Target Reached

Avoid labeling someone as failing based on short-term weight fluctuations.

10. MVP MODULE 4 — WORKOUT MANAGEMENT

Routes:

/workouts

/workouts/plans

/workouts/plans/:id

/workouts/session/:id

/workouts/history

/workouts/history/:id

This module is one of the most important parts of the MVP.

10.1 Workout Overview

Display:

Current workout plan

Today's workout

Weekly workout schedule

Recent completed workouts

Total workouts completed

Quick Start Workout action

10.2 Workout Plan Management

Allow users to:

Create workout plans

Edit workout plans

Delete workout plans

Add exercises

Remove exercises

Reorder exercises

Assign workout days

Specify sets

Specify target repetitions

Specify rest duration

10.3 Exercise Library

Create a starter exercise library with:

Goblet Squat

Dumbbell Floor Press

One-Arm Dumbbell Row

Dumbbell Biceps Curl

Dumbbell Romanian Deadlift

Dumbbell Shoulder Press

Dumbbell Reverse Lunge

Plank

Push-Up

Dumbbell Lateral Raise

Dumbbell Triceps Extension

Dumbbell Calf Raise

Each exercise must include:

Exercise name

Description

Primary muscle group

Equipment required

Instructions

Suggested sets

Suggested repetitions

Exercise illustrations are optional for the first release. Do not use unrelated placeholder images as if they demonstrate the exercise.

10.4 Default Workout Templates

Seed two default templates.

Workout A

Dumbbell Goblet Squat — 3 × 10–12

Dumbbell Floor Press — 3 × 8–12

One-Arm Dumbbell Row — 3 × 10–12 per arm

Dumbbell Biceps Curl — 2 × 10–15

Workout B

Dumbbell Romanian Deadlift — 3 × 10–12

Dumbbell Shoulder Press — 3 × 8–12

Dumbbell Reverse Lunge — 3 × 8–10 per leg

Forearm Plank — 3 × 20–40 seconds

Default schedule:

Monday: Workout A

Wednesday: Workout B

Friday: Workout A

Alternate A/B scheduling in subsequent weeks.

Allow users to modify this schedule.

10.5 Active Workout Session

Create an interactive workout session interface.

Display:

Workout title

Exercise name

Current exercise

Set number

Target repetitions

Actual repetitions

Dumbbell weight

Rest timer

Session duration

Functions:

Start workout

Log set

Mark set complete

Edit completed set

Move to next exercise

Skip exercise

Pause or resume rest timer

Finish workout

Cancel workout with confirmation

Preserve an in-progress workout if the user navigates away or refreshes the page.

10.6 Set Tracking

Each completed set should store:

Exercise

Set number

Repetitions

Weight in kilograms

Completion timestamp

For unilateral exercises, allow side-specific information where relevant.

For timed exercises such as planks, store duration instead of forcing repetitions.

Clearly label whether recorded dumbbell weight is per dumbbell or combined weight.

10.7 Workout History

Display:

Workout date

Workout title

Duration

Exercises completed

Sets completed

Weight and repetitions

Total training volume where applicable

Training volume may be calculated as:

Volume = Sum of Repetitions × Load

Do not calculate volume for timed exercises using an invalid formula.

Allow users to open previous sessions and review details.

11. MVP MODULE 5 — NUTRITION TRACKING

Routes:

/nutrition

/nutrition/log

/nutrition/foods

/nutrition/history

11.1 Nutrition Dashboard

Display:

Calories consumed

Calorie goal

Protein consumed

Protein goal

Carbohydrates consumed

Fat consumed

Today's logged meals

Use progress rings and bars.

11.2 Food Logging

Allow users to:

Search foods

Select food

Enter quantity

Select serving unit

Assign meal category

Save food entry

Edit food entry

Delete food entry

Meal categories:

Breakfast

Lunch

Dinner

Snack

11.3 Filipino Food Database

Seed an initial collection of common foods:

Cooked White Rice

Egg

Chicken Breast

Chicken Adobo

Canned Sardines

Tofu

Monggo

Banana

Milk

Peanut Butter

Bread

Peanuts

Tilapia

Tuna

Oatmeal

Sweet Potato

Vegetables

Each food record should contain:

Name

Serving description

Serving size

Calories

Protein

Carbohydrates

Fat

Unit

Source or reference note, when available

Use reasonable nutritional reference values.

Clearly label approximate nutritional information.

Do not invent exact nutritional values for unspecified recipes.

Allow users to override values based on food labels or actual recipes.

11.4 Quantity Calculations

Calculate nutritional values proportionally.

Example:

If 100 g of food contains 150 kcal and 10 g protein, then 200 g contains:

300 kcal

20 g protein

Apply the same calculation to carbohydrates and fats.

Avoid floating-point display issues through consistent rounding.

11.5 Daily Meal History

Group entries by:

Breakfast

Lunch

Dinner

Snacks

Display meal subtotals and daily totals.

11.6 Nutrition History

Allow users to select previous dates and review logged consumption.

Display:

Total calories

Total protein

Total carbohydrates

Total fats

Logged food entries

Support date navigation.

11.7 Custom Foods

Allow users to create custom foods.

Fields:

Food name

Serving size

Serving unit

Calories

Protein

Carbohydrates

Fat

Custom foods must belong to the authenticated user.

12. MVP MODULE 6 — ANALYTICS AND REPORTS

Route: /reports

Create an analytics page that provides useful insights from real saved data.

12.1 Weight Analytics

Display:

Weight trend

Weight gained or lost

Average weekly weight change

Progress toward target

12.2 Workout Analytics

Display:

Completed workouts

Weekly workout count

Total exercise sets

Workout consistency

Selected exercise performance trends

12.3 Nutrition Analytics

Display:

Average daily calorie intake

Average daily protein intake

Days with food logs

Calorie goal comparison

Protein goal comparison

12.4 Date Filters

Support:

Last 7 days

Last 30 days

Last 90 days

Custom date range

12.5 Data Accuracy

All analytics must use actual database records.

Do not fabricate missing historical values.

Use appropriate empty states when there is insufficient data.

13. MVP MODULE 7 — PROFILE AND SETTINGS

Routes:

/profile

/settings

13.1 Profile Management

Allow users to update:

Display name

Height

Date of birth or age

Activity level

Preferred workout equipment

13.2 Preferences

Support:

Weight units

Height units

Time zone

Date format

Default landing page

Dark mode is the primary MVP theme.

A light theme may be added after core features are complete.

13.3 Account Management

Include:

Change password

Sign out

Request account deletion

Account deletion must include confirmation and a secure process for deleting or appropriately retaining associated data.

14. DATABASE DESIGN

Use PostgreSQL through Supabase.

Create normalized database tables with primary keys, foreign keys, timestamps, constraints, and indexes.

Core Tables

profiles

id UUID, references auth.users

full_name

date_of_birth

sex, nullable

height_cm

activity_level

experience_level

onboarding_completed

created_at

updated_at

fitness_goals

id UUID

user_id UUID

goal_type

starting_weight_kg

target_weight_kg

weekly_weight_change_target_kg

daily_calorie_target

daily_protein_target_g

start_date

status

created_at

updated_at

weight_logs

id UUID

user_id UUID

weight_kg

measured_at

notes

created_at

updated_at

exercises

id UUID

created_by UUID, nullable

name

description

primary_muscle_group

equipment

instructions

tracking_type

is_system_exercise

created_at

workout_plans

id UUID

user_id UUID

name

description

is_active

created_at

updated_at

workout_plan_exercises

id UUID

workout_plan_id UUID

exercise_id UUID

exercise_order

target_sets

target_reps_min

target_reps_max

target_duration_seconds

rest_seconds

workout_schedule

id UUID

user_id UUID

workout_plan_id UUID

day_of_week

effective_from

effective_until

workout_sessions

id UUID

user_id UUID

workout_plan_id UUID

started_at

ended_at

status

notes

created_at

workout_session_exercises

id UUID

workout_session_id UUID

exercise_id UUID

exercise_order

status

workout_sets

id UUID

workout_session_exercise_id UUID

set_number

repetitions

weight_kg

weight_basis

duration_seconds

side

completed_at

foods

id UUID

created_by UUID, nullable

name

serving_size

serving_unit

calories

protein_g

carbs_g

fat_g

source_note

is_system_food

created_at

food_logs

id UUID

user_id UUID

food_id UUID

meal_type

consumed_at

quantity

serving_multiplier

calories_snapshot

protein_snapshot_g

carbs_snapshot_g

fat_snapshot_g

created_at

updated_at

Store nutritional snapshots so historical records remain accurate if the food database changes.

user_settings

id UUID

user_id UUID, unique

weight_unit

height_unit

timezone

date_format

theme

created_at

updated_at

Database Rules

Use UUID primary keys.

Enforce foreign key relationships.

Apply appropriate unique constraints.

Use database constraints for valid numerical values.

Index user_id and frequently queried date columns.

Use timezone-aware timestamps.

Use Row Level Security.

Use migrations rather than manual database modifications.

Ensure deletion behavior is deliberate and consistent.

Prevent unauthorized access to system and private records.

15. REQUIRED APPLICATION ROUTES

Public Routes

/

/login

/register

/forgot-password

/reset-password

Authenticated Routes

/onboarding

/dashboard

/workouts

/workouts/plans

/workouts/plans/:id

/workouts/session/:id

/workouts/history

/workouts/history/:id

/nutrition

/nutrition/log

/nutrition/foods

/nutrition/history

/progress

/progress/weight

/progress/goals

/reports

/profile

/settings

Implement a proper 404 page.

Use protected routes and onboarding redirects.

16. RECOMMENDED PROJECT STRUCTURE

Use a feature-based modular architecture.

fittrack/
├── public/
│   ├── icons/
│   └── manifest assets
├── src/
│   ├── app/
│   │   ├── router/
│   │   ├── providers/
│   │   └── layouts/
│   ├── components/
│   │   ├── ui/
│   │   ├── common/
│   │   ├── charts/
│   │   └── navigation/
│   ├── features/
│   │   ├── auth/
│   │   ├── onboarding/
│   │   ├── dashboard/
│   │   ├── goals/
│   │   ├── weight/
│   │   ├── workouts/
│   │   ├── nutrition/
│   │   ├── reports/
│   │   └── settings/
│   ├── hooks/
│   ├── lib/
│   │   ├── supabase/
│   │   ├── validation/
│   │   └── calculations/
│   ├── types/
│   ├── styles/
│   └── main.tsx
├── supabase/
│   ├── migrations/
│   └── seed.sql
├── tests/
├── .env.example
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md

Each feature should contain its own components, hooks, services, validation schemas, and types where appropriate.

Avoid unnecessarily complex abstractions.

17. SYSTEM WORKFLOWS

Workflow A — New User

User opens FitTrack.

User creates an account.

User verifies email if required.

User signs in.

User completes onboarding.

User sets fitness goals.

User selects workout preferences.

System saves profile and goals.

System displays personalized dashboard.

Workflow B — Weight Logging

User opens Progress.

User selects Add Weight.

User enters weight and date.

System validates input.

System saves record.

Weight history updates.

Progress chart updates.

Dashboard statistics update.

Workflow C — Workout Tracking

User opens Workouts.

User selects a workout.

User starts a session.

User completes an exercise set.

User enters repetitions and weight.

System saves set data.

User continues to the next set.

User finishes the workout.

System marks session completed.

Workout history and analytics update.

Workflow D — Meal Logging

User opens Nutrition.

User selects Log Meal.

User searches for food.

User enters portion size.

System calculates nutrients.

User selects meal category.

User saves entry.

Daily nutrition totals update.

Dashboard calorie and protein cards update.

Workflow E — Goal Monitoring

User opens Dashboard.

System loads current goals.

System retrieves relevant records.

System calculates progress.

System displays current status.

User opens Reports for historical analysis.

18. VALIDATION AND ERROR HANDLING

Implement both frontend validation and database constraints.

Examples:

Weight must be a positive, reasonable number.

Height must be positive.

Calories must not be negative.

Protein, carbohydrates, and fats must not be negative.

Repetitions must be nonnegative integers.

Exercise load must not be negative.

Session completion time cannot precede start time.

A food quantity must be greater than zero.

Password confirmation must match.

Required fields must not be empty.

Handle:

Network failures

Invalid authentication

Expired sessions

Missing records

Duplicate submissions

Database errors

Unexpected application errors

Display understandable error messages.

Never silently discard user input.

Prevent duplicate records caused by repeated button clicks.

19. PERFORMANCE REQUIREMENTS

Optimize the application for mobile devices and ordinary internet connections.

Requirements:

Code splitting

Lazy-loaded pages

Optimized assets

Efficient database queries

Appropriate TanStack Query caching

Minimal unnecessary rerenders

Loading skeletons

Debounced search where useful

Proper empty states

Responsive charts

Accessible interactions

Avoid unnecessary database requests.

Do not fetch entire historical datasets when only recent records are required.

20. ACCESSIBILITY REQUIREMENTS

Target WCAG 2.2 AA where practical.

Include:

Semantic HTML

Keyboard navigation

Visible focus indicators

Accessible form labels

Sufficient color contrast

Screen reader-friendly messages

Accessible dialogs

Clear error descriptions

Reduced-motion support

Touch targets appropriate for mobile devices

Charts must have accompanying text summaries or accessible data alternatives.

21. SECURITY REQUIREMENTS

Implement:

Supabase authentication

Row Level Security

Secure environment variable handling

Input validation

Safe database queries

Protected private routes

Proper session management

Secure password reset

Appropriate storage policies

Secure account deletion

HTTPS deployment

Never store passwords directly in custom database tables.

Never expose server-only secrets in frontend code.

Test unauthorized access between different accounts.

22. MVP ACCEPTANCE CRITERIA

The MVP is complete only when the following are verified:

Authentication

User can register.

User can log in.

User can log out.

User can reset their password.

Protected pages reject unauthenticated access.

Onboarding

User can complete onboarding.

Profile data persists.

Fitness goals persist.

Onboarding does not repeat unnecessarily.

Dashboard

Dashboard displays actual user data.

Weight statistics update correctly.

Nutrition totals update correctly.

Workout information updates correctly.

Weight Tracking

User can add weight entries.

User can edit entries.

User can delete entries.

Charts reflect actual entries.

Goal calculations are correct.

Workout Management

User can create workout plans.

User can edit plans.

User can start workouts.

User can record sets.

User can finish workouts.

Workout history persists.

Nutrition

User can search foods.

User can create custom foods.

User can log meals.

User can edit and delete food logs.

Nutrition totals calculate correctly.

Reports

Charts use actual saved records.

Filters work correctly.

Empty states display appropriately.

Settings

User can update profile.

Preferences persist.

User can sign out.

General

Mobile layout works correctly.

Desktop layout works correctly.

No critical TypeScript errors.

No broken navigation.

No fake functional controls.

No unauthorized database access.

No critical console errors.

Production build succeeds.

23. TESTING STRATEGY

Use:

Vitest for unit tests

React Testing Library for component tests

Playwright for essential end-to-end workflows

Prioritize tests for:

Authentication and route protection.

Onboarding completion.

Weight entry calculations.

Workout session creation and completion.

Food portion and nutrient calculations.

Goal progress calculations.

Database access restrictions.

Mobile navigation.

Record editing and deletion.

Include tests for invalid inputs and empty datasets.

24. DEVELOPMENT PHASES

Follow this implementation order.

Phase 1 — Foundation

Build:

React project setup

TypeScript configuration

Tailwind CSS

shadcn/ui

Design tokens

Routing

Application layouts

Supabase integration

Authentication

Database migrations

Row Level Security

Deliverable: A secure, working application foundation.

Phase 2 — Onboarding and Dashboard

Build:

Onboarding wizard

Profile creation

Fitness goal setup

Dashboard layout

Initial dashboard data queries

Reusable statistic cards

Responsive navigation

Deliverable: A personalized dashboard with real profile and goal data.

Phase 3 — Weight and Goal Tracking

Build:

Weight entry management

Weight history

Weight charts

Goal calculations

Dashboard integration

Deliverable: A fully functional weight tracking experience.

Phase 4 — Workout Management

Build:

Exercise library

Workout templates

Workout plan editor

Workout scheduling

Active workout session

Set tracking

Workout history

Deliverable: A complete dumbbell workout tracker.

Phase 5 — Nutrition Management

Build:

Food database

Food search

Custom foods

Food logging

Nutrition calculations

Daily nutrition overview

Nutrition history

Deliverable: A functional calorie and protein tracking system.

Phase 6 — Reports and Settings

Build:

Weight analytics

Workout analytics

Nutrition analytics

Profile management

User preferences

Account controls

Deliverable: A complete MVP feature set.

Phase 7 — Testing and Deployment

Perform:

Functional testing

Database security testing

Responsive testing

Accessibility review

Performance optimization

Production build

PWA configuration

Vercel deployment

Final verification

Deliverable: A deployable FitTrack MVP.

25. FUTURE FEATURES — DO NOT BUILD DURING MVP

Prepare a modular architecture that can support these features later, but do not implement them until the MVP is stable.

Phase 2 Features

Seven-day meal planning

Grocery shopping lists

Food budget tracking

Expense management

Body measurements

Progress photos

Hydration tracking

Sleep tracking

Habit tracking

Workout calendar enhancements

CSV and PDF exports

Phase 3 Features

Adaptive calorie suggestions

Progressive overload recommendations

Smart Filipino meal suggestions

Automated progress summaries

Push notifications

Advanced analytics

Offline data entry and synchronization

AI-powered coaching assistance

Phase 4 Features

Expanded exercise demonstrations

Barcode food scanning

Fitness device integrations

Advanced nutrition databases

Optional multi-user functionality

Native mobile application

Do not add these modules prematurely.

26. CODING AND IMPLEMENTATION STANDARDS

Follow these development rules:

Write clean, maintainable TypeScript.

Use reusable React components.

Organize code by feature.

Keep business logic separate from presentation.

Use strongly typed database interfaces.

Validate user input.

Handle asynchronous errors.

Avoid unnecessary dependencies.

Avoid duplicate business logic.

Implement accessible UI controls.

Use responsive layouts.

Keep database migrations version-controlled.

Never hardcode user progress values.

Never expose sensitive credentials.

Provide meaningful loading and empty states.

Document important architectural decisions.

Test core calculations.

Verify each feature before proceeding.

Do not use placeholder buttons that appear functional.

Prefer working implementations over visual-only mockups.

27. REQUIRED DEVELOPMENT OUTPUTS

Provide:

Complete project structure.

All necessary frontend source code.

Supabase database migrations.

Row Level Security policies.

Starter exercise data.

Starter Filipino food data.

Authentication integration.

Functional dashboard.

Weight and goal tracking.

Workout management.

Nutrition tracking.

Analytics and reports.

Profile and settings.

Environment variable example.

Installation instructions.

Local development instructions.

Testing instructions.

Deployment instructions.

README documentation.

Summary of completed features and remaining work.

28. INITIAL USER CONFIGURATION

Use the following information only as an optional local development example or onboarding prefill, not as a globally shared account.

Age: 23 years

Height: 163 cm

Starting weight: 48 kg

Initial target weight: 55 kg

Goal: Lean bulk and muscle gain

Workout location: Home

Equipment: Dumbbells

Preferred schedule: Monday, Wednesday, Friday

Initial daily calorie target: 2,100 kcal

Initial daily protein target: 95 g

Food budget: ₱100–₱150 daily

Currency: PHP

Time zone: Asia/Manila

These targets must be editable and clearly presented as estimates.

Do not populate fabricated historical weight measurements, workout completions, or food consumption records.

29. FINAL DEVELOPMENT INSTRUCTIONS

Begin by establishing the complete MVP architecture and implementation plan.

Then implement the application incrementally according to the defined phases.

At the end of each phase:

Verify the application builds.

Check TypeScript errors.

Test the implemented functionality.

Verify database integration.

Verify authentication and security requirements.

Confirm responsive behavior.

Summarize what has been completed.

Identify remaining tasks.

Do not skip essential functionality to move to later phases.

Do not claim a feature is complete unless it has been implemented and verified.

Do not introduce unnecessary modules, payment systems, administrator dashboards, social feeds, or AI features into the MVP.

If Supabase credentials or external configuration are required, provide exact setup instructions and clearly identify the configuration that the developer must supply.

Use the supplied FitTrack design reference to guide visual implementation, while improving usability, consistency, accessibility, and responsiveness wherever necessary.

Final objective: Deliver a polished, secure, responsive, installable, and fully functional FitTrack MVP that allows a user to track weight gain, dumbbell workouts, daily nutrition, and fitness progress from one integrated application.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/11b589cb-720d-5cb2-ae3d-59a8d8fc1f4f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
