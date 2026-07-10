#!/usr/bin/env node
// Seeds 5 realistic, pre-verified demo company accounts and 5 SIWES listings
// each (25 jobs across software, design, engineering, finance, telecoms and
// marketing). Companies are created already 'approved' with a logo, so their
// listings are publicly visible immediately — no admin verification step
// needed for these seeded accounts.
//
// Usage:
//   MONGODB_URI=... node scripts/seed-companies.mjs [password]
//
// Every seeded account shares one password (default below) so you can log in
// as any company. Re-running is safe: accounts are upserted by email and
// their previous seeded jobs are replaced.

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const PASSWORD = process.argv[2] || process.env.SEED_COMPANY_PASSWORD || 'SiwesDemo#1';

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI must be set in the environment.');
  process.exit(1);
}

// Plain schemas (strict: false) so this script runs outside the TS build and
// coexists with the full schemas in src/models.
const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false, timestamps: true }), 'users');
const Job = mongoose.models.Job || mongoose.model('Job', new mongoose.Schema({}, { strict: false, timestamps: true }), 'jobs');

const COMPANIES = [
  {
    name: 'Paystack',
    email: 'careers@paystack.com',
    companyName: 'Paystack',
    industry: 'Financial Technology',
    companyDescription: 'Paystack helps businesses in Africa get paid by anyone, anywhere in the world. Our SIWES program places students inside real product teams.',
    avatarUrl: '/logos/paystack.svg',
    jobs: [
      { title: 'Frontend Engineering Intern', location: 'Lagos, Nigeria', type: 'Hybrid', duration: '6 months', stipend: '₦120,000', requirements: ['React', 'TypeScript', 'CSS'], description: 'Work with the dashboard team building merchant-facing interfaces. You will ship production React code, participate in code reviews, and pair with senior engineers weekly.' },
      { title: 'Product Design Intern', location: 'Lagos, Nigeria', type: 'Hybrid', duration: '6 months', stipend: '₦100,000', requirements: ['Figma', 'Adobe Photoshop', 'UI/UX Design'], description: 'Join the design team creating flows for payment products used by 200k+ businesses. You will design in Figma and Adobe Photoshop, run usability tests, and build out our design system.' },
      { title: 'Backend Engineering Intern', location: 'Lagos, Nigeria', type: 'On-site', duration: '6 months', stipend: '₦120,000', requirements: ['Node.js', 'SQL', 'APIs'], description: 'Build and maintain payment APIs processing millions of transactions. Exposure to distributed systems, queues, and reliability engineering.' },
      { title: 'Data Analyst Intern', location: 'Lagos, Nigeria', type: 'Remote', duration: '4 months', stipend: '₦90,000', requirements: ['SQL', 'Excel', 'Data Analysis', 'Python'], description: 'Analyse transaction and merchant data to answer real business questions. You will build dashboards, write SQL daily, and present insights to product teams.' },
      { title: 'Customer Success Intern', location: 'Lagos, Nigeria', type: 'On-site', duration: '4 months', stipend: '₦70,000', requirements: ['Communication', 'Excel', 'Problem Solving'], description: 'Support merchants integrating Paystack, triage technical questions, and document recurring issues for the product team.' },
    ],
  },
  {
    name: 'Andela',
    email: 'internships@andela.com',
    companyName: 'Andela',
    industry: 'Technology Services',
    companyDescription: 'Andela connects brilliant African technologists with global opportunities. Our internship track mentors students into world-class engineers.',
    avatarUrl: '/logos/andela.svg',
    jobs: [
      { title: 'Software Engineering Intern', location: 'Remote (Nigeria)', type: 'Remote', duration: '6 months', stipend: '₦110,000', requirements: ['JavaScript', 'React', 'Node.js', 'Git'], description: 'Rotate through full-stack project teams with a dedicated mentor. Weekly code reviews, agile ceremonies, and a capstone project shipped to production.' },
      { title: 'Quality Assurance (QA) Intern', location: 'Remote (Nigeria)', type: 'Remote', duration: '4 months', stipend: '₦80,000', requirements: ['Testing', 'Selenium', 'Attention to Detail'], description: 'Learn manual and automated testing on live client projects: writing test plans, automating regression suites, and reporting defects.' },
      { title: 'DevOps Engineering Intern', location: 'Remote (Nigeria)', type: 'Remote', duration: '6 months', stipend: '₦110,000', requirements: ['Linux', 'Docker', 'CI/CD', 'Networking'], description: 'Support build pipelines and cloud infrastructure. You will containerise services, monitor deployments, and automate developer workflows.' },
      { title: 'Technical Writing Intern', location: 'Remote (Nigeria)', type: 'Remote', duration: '4 months', stipend: '₦60,000', requirements: ['Writing', 'Markdown', 'Documentation'], description: 'Create developer documentation, tutorials and onboarding guides for engineering teams and open-source projects.' },
      { title: 'Community & Marketing Intern', location: 'Lagos, Nigeria', type: 'Hybrid', duration: '4 months', stipend: '₦60,000', requirements: ['Social Media', 'Content Creation', 'Adobe Photoshop'], description: 'Grow Andela\'s developer community: plan events, create social content and design campaign assets in Adobe Photoshop and Canva.' },
    ],
  },
  {
    name: 'MTN Nigeria',
    email: 'siwes@mtn.com.ng',
    companyName: 'MTN Nigeria',
    industry: 'Telecommunications',
    companyDescription: 'MTN Nigeria is the largest telecoms operator in Nigeria. Our SIWES scheme rotates students through network, IT and commercial units.',
    avatarUrl: '/logos/mtn.svg',
    jobs: [
      { title: 'Network Engineering Intern', location: 'Lagos, Nigeria', type: 'On-site', duration: '6 months', stipend: '₦100,000', requirements: ['Networking', 'Cisco', 'TCP/IP'], description: 'Work with the core network team on LTE/5G infrastructure: site monitoring, fault escalation, and radio network performance reporting.' },
      { title: 'IT Support Intern', location: 'Abuja, Nigeria', type: 'On-site', duration: '4 months', stipend: '₦70,000', requirements: ['Windows', 'Networking', 'Troubleshooting'], description: 'First-line support for enterprise staff: device setup, account administration, and ticket resolution across regional offices.' },
      { title: 'Graphic Design Intern', location: 'Lagos, Nigeria', type: 'Hybrid', duration: '4 months', stipend: '₦75,000', requirements: ['Adobe Photoshop', 'Adobe Illustrator', 'Design'], description: 'Join the brand team producing campaign visuals, social media assets and in-store materials in Adobe Photoshop and Illustrator.' },
      { title: 'Human Resources Intern', location: 'Lagos, Nigeria', type: 'On-site', duration: '4 months', stipend: '₦65,000', requirements: ['Communication', 'Excel', 'Organisation'], description: 'Support talent acquisition and employee engagement: scheduling interviews, onboarding logistics, and HR data reporting.' },
      { title: 'Marketing Analytics Intern', location: 'Lagos, Nigeria', type: 'Hybrid', duration: '6 months', stipend: '₦85,000', requirements: ['Data Analysis', 'Excel', 'SQL', 'PowerPoint'], description: 'Analyse subscriber campaigns and churn data, build weekly performance decks, and support segmentation studies for consumer marketing.' },
    ],
  },
  {
    name: 'Dangote Group',
    email: 'careers@dangote.com',
    companyName: 'Dangote Group',
    industry: 'Manufacturing & Industrial',
    companyDescription: 'Dangote Group is Africa\'s leading industrial conglomerate spanning cement, refining, fertiliser and logistics. Our SIWES program is hands-on plant experience.',
    avatarUrl: '/logos/dangote.svg',
    jobs: [
      { title: 'Mechanical Engineering Intern', location: 'Obajana, Kogi', type: 'On-site', duration: '6 months', stipend: '₦90,000', requirements: ['Mechanical Engineering', 'AutoCAD', 'Maintenance'], description: 'Rotate through plant maintenance units: rotating equipment, preventive maintenance planning, and reliability analysis at the cement plant.' },
      { title: 'Electrical Engineering Intern', location: 'Obajana, Kogi', type: 'On-site', duration: '6 months', stipend: '₦90,000', requirements: ['Electrical Engineering', 'PLC', 'Instrumentation'], description: 'Work with the electrical and automation team on motor control centres, PLC troubleshooting and power distribution systems.' },
      { title: 'Chemical/Process Engineering Intern', location: 'Lekki, Lagos', type: 'On-site', duration: '6 months', stipend: '₦95,000', requirements: ['Chemical Engineering', 'Process Safety', 'Excel'], description: 'Join process operations at the refinery/petrochemical complex: mass balance exercises, process monitoring and HSE compliance.' },
      { title: 'Accounting Intern', location: 'Ikoyi, Lagos', type: 'On-site', duration: '4 months', stipend: '₦70,000', requirements: ['Accounting', 'Excel', 'SAP'], description: 'Support the finance team with reconciliations, accounts payable processing and month-end reporting in SAP.' },
      { title: 'Supply Chain & Logistics Intern', location: 'Ikeja, Lagos', type: 'Hybrid', duration: '4 months', stipend: '₦70,000', requirements: ['Logistics', 'Excel', 'Data Analysis'], description: 'Track fleet utilisation and delivery performance across distribution routes, and support demand planning analytics.' },
    ],
  },
  {
    name: 'Zenith Bank',
    email: 'siwes@zenithbank.com',
    companyName: 'Zenith Bank',
    industry: 'Banking & Financial Services',
    companyDescription: 'Zenith Bank is one of Nigeria\'s largest banks. Our SIWES placements sit inside technology, operations and digital banking teams.',
    avatarUrl: '/logos/zenith.svg',
    jobs: [
      { title: 'Software Development Intern', location: 'Victoria Island, Lagos', type: 'On-site', duration: '6 months', stipend: '₦100,000', requirements: ['Java', 'SQL', 'Spring Boot'], description: 'Build internal banking tools with the core applications team: REST services, database procedures, and automated tests.' },
      { title: 'Cybersecurity Intern', location: 'Victoria Island, Lagos', type: 'On-site', duration: '6 months', stipend: '₦100,000', requirements: ['Networking', 'Security', 'Linux'], description: 'Work with the SOC team on log monitoring, phishing triage, vulnerability scanning and security awareness campaigns.' },
      { title: 'Banking Operations Intern', location: 'Marina, Lagos', type: 'On-site', duration: '4 months', stipend: '₦65,000', requirements: ['Excel', 'Attention to Detail', 'Communication'], description: 'Rotate through branch operations: account services, clearing, reconciliation and customer onboarding compliance checks.' },
      { title: 'Data Science Intern', location: 'Victoria Island, Lagos', type: 'Hybrid', duration: '6 months', stipend: '₦110,000', requirements: ['Python', 'SQL', 'Machine Learning', 'Data Analysis'], description: 'Build credit-risk and fraud-detection models with the analytics team, from feature engineering to model monitoring.' },
      { title: 'Digital Marketing & Design Intern', location: 'Victoria Island, Lagos', type: 'Hybrid', duration: '4 months', stipend: '₦70,000', requirements: ['Adobe Photoshop', 'Social Media', 'Content Creation'], description: 'Create social and in-app campaign assets in Adobe Photoshop, track engagement metrics, and support product launch campaigns.' },
    ],
  },
];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const hashedPassword = await bcrypt.hash(PASSWORD, 10);

  for (const company of COMPANIES) {
    const { jobs, ...account } = company;

    const user = await User.findOneAndUpdate(
      { email: account.email },
      {
        $set: {
          ...account,
          password: hashedPassword,
          role: 'employer',
          verificationStatus: 'approved', // pre-verified: listings are publicly visible immediately
          verificationReviewedAt: new Date(),
          cacNumber: 'RC-DEMO',
          officialEmail: account.email,
        },
      },
      { upsert: true, new: true }
    );

    // Replace this company's previous listings so re-runs don't duplicate.
    await Job.deleteMany({ employerId: user._id });
    await Job.insertMany(
      jobs.map((job) => ({
        ...job,
        employerId: user._id,
        isActive: true,
        applicationMethod: 'platform',
        applicantCount: 0,
      }))
    );

    console.log(`✔ ${account.companyName} (${account.email}) — ${jobs.length} listings`);
  }

  console.log(`\nDone. 5 verified companies, 25 listings.`);
  console.log(`Log in as any of them with password: ${PASSWORD}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
