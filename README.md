# Ayuuto / Hagbad Management System

React + Supabase starter for a Somali Ayuuto/Hagbad group savings management system.

## What is included

- Phone OTP login with Supabase Auth
- Admin and member role support
- Supabase SQL schema with RLS policies
- Groups, members, rounds, payments, payouts, and reports pages
- Member dashboard with personal payment history and receiver schedule
- CSV report export
- Simple i18n structure for Somali/Arabic translations later
- Tailwind CSS styling

## Setup

### 1. Create Supabase project

Create a Supabase project, then open **SQL Editor** and run:

```sql
supabase/schema.sql
```

### 2. Enable phone authentication

In Supabase Dashboard:

- Go to Authentication
- Enable Phone provider
- Configure an SMS provider such as Twilio

Phone OTP will not send until the SMS provider is configured.

### 3. Create your first admin

Login once using the phone number in the app. Supabase will create a normal member profile.

Then run this SQL in Supabase SQL Editor:

```sql
update public.profiles
set role = 'admin', full_name = 'Your Name'
where phone = '+25261xxxxxxx';
```

Logout and login again. You should now enter the admin dashboard.

### 4. Install and run frontend

```bash
npm install
cp .env.example .env
npm run dev
```

Fill `.env` with your Supabase URL and anon key:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Normal workflow

1. Admin logs in.
2. Admin creates an Ayuuto group.
3. Admin adds members with name and phone number.
4. Admin clicks **Generate rounds**.
5. The system creates:
   - one round per active member
   - unpaid payment rows for every member in every round
   - payout row for the receiver of each round
6. Admin opens round details and records payments.
7. Admin marks payout as received when the receiver gets money.
8. Member logs in using phone number and sees only their own allowed data.

## Important note

Payments are not designed to be deleted from the app. If there is a mistake, mark the payment as `cancelled` or `corrected` and add notes.
