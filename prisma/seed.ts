// prisma/seed.ts
// Seeds the database with realistic mining/community recruitment data

import { PrismaClient, UserRole, VerificationStatus, JobStatus, ApplicationStatus, DocumentType, SkillProficiency } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Verified Local Talent Platform...');

  // ── COMMUNITIES ──────────────────────────────────────────────────────────────
  const communities = await Promise.all([
    prisma.community.upsert({
      where: { name: 'Akyem Kotoku' },
      update: {},
      create: { name: 'Akyem Kotoku', region: 'Eastern Region', description: 'Host community near the main open-pit site' },
    }),
    prisma.community.upsert({
      where: { name: 'Obuasi Fankyenebra' },
      update: {},
      create: { name: 'Obuasi Fankyenebra', region: 'Ashanti Region', description: 'Western corridor host community' },
    }),
    prisma.community.upsert({
      where: { name: 'Prestea Bondaye' },
      update: {},
      create: { name: 'Prestea Bondaye', region: 'Western Region', description: 'Southern host community near processing plant' },
    }),
  ]);

  console.log(`✅ Created ${communities.length} communities`);

  // ── SKILLS ───────────────────────────────────────────────────────────────────
  const skillsData = [
    { name: 'Drilling Operations', category: 'Mining Operations' },
    { name: 'Blasting & Explosives', category: 'Mining Operations' },
    { name: 'Underground Mining', category: 'Mining Operations' },
    { name: 'Open-Pit Mining', category: 'Mining Operations' },
    { name: 'Ore Processing', category: 'Processing' },
    { name: 'Crusher Operation', category: 'Processing' },
    { name: 'Ball Mill Operation', category: 'Processing' },
    { name: 'Heavy Equipment Operation', category: 'Equipment' },
    { name: 'Dump Truck Operation', category: 'Equipment' },
    { name: 'Excavator Operation', category: 'Equipment' },
    { name: 'Safety & Risk Assessment', category: 'Safety' },
    { name: 'First Aid', category: 'Safety' },
    { name: 'Environmental Compliance', category: 'Safety' },
    { name: 'Electrical Maintenance', category: 'Maintenance' },
    { name: 'Mechanical Maintenance', category: 'Maintenance' },
    { name: 'Welding', category: 'Maintenance' },
    { name: 'Community Relations', category: 'Soft Skills' },
    { name: 'Technical Reporting', category: 'Soft Skills' },
  ];

  const skills = await Promise.all(
    skillsData.map(s =>
      prisma.skill.upsert({
        where: { name: s.name },
        update: {},
        create: s,
      })
    )
  );

  console.log(`✅ Created ${skills.length} skills`);

  const skillMap = Object.fromEntries(skills.map(s => [s.name, s]));

  // ── ADMIN USER ────────────────────────────────────────────────────────────────
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@miningco.gh' },
    update: {},
    create: {
      email: 'admin@miningco.gh',
      phone: '+233200000001',
      passwordHash: await bcrypt.hash('Admin@1234', 12),
      role: UserRole.ADMIN,
    },
  });

  // ── HR OFFICER ────────────────────────────────────────────────────────────────
  const hrUser = await prisma.user.upsert({
    where: { email: 'hr@miningco.gh' },
    update: {},
    create: {
      email: 'hr@miningco.gh',
      phone: '+233200000002',
      passwordHash: await bcrypt.hash('Hr@12345', 12),
      role: UserRole.HR_OFFICER,
    },
  });

  // ── YOUTH PRESIDENTS ─────────────────────────────────────────────────────────
  const yp1 = await prisma.user.upsert({
    where: { email: 'yp.kotoku@gmail.com' },
    update: {},
    create: {
      email: 'yp.kotoku@gmail.com',
      phone: '+233244000010',
      passwordHash: await bcrypt.hash('Youth@123', 12),
      role: UserRole.YOUTH_PRESIDENT,
    },
  });

  const yp2 = await prisma.user.upsert({
    where: { email: 'yp.fankyenebra@gmail.com' },
    update: {},
    create: {
      email: 'yp.fankyenebra@gmail.com',
      phone: '+233244000011',
      passwordHash: await bcrypt.hash('Youth@123', 12),
      role: UserRole.YOUTH_PRESIDENT,
    },
  });

  // Assign YPs to communities
  await prisma.community.update({
    where: { id: communities[0].id },
    data: { youthPresidentId: yp1.id },
  });
  await prisma.community.update({
    where: { id: communities[1].id },
    data: { youthPresidentId: yp2.id },
  });

  // ── CHIEF STAFF USER ─────────────────────────────────────────────────────────
  const chiefStaff = await prisma.user.upsert({
    where: { email: 'chiefstaff@miningco.gh' },
    update: {},
    create: {
      email: 'chiefstaff@miningco.gh',
      phone: '+233200000003',
      passwordHash: await bcrypt.hash('Chief@123', 12),
      role: UserRole.CHIEF_STAFF,
    },
  });

  console.log('✅ Created system users (admin, hr, youth presidents, chief staff)');

  // ── APPLICANTS ────────────────────────────────────────────────────────────────
  const applicantsData = [
    {
      email: 'kwame.asante@gmail.com',
      phone: '+233244100001',
      fullName: 'Kwame Asante',
      communityIdx: 0,
      verificationStatus: VerificationStatus.VERIFIED,
      bio: 'Experienced underground miner with strong safety record',
      skills: [
        { name: 'Underground Mining', yearsOfExp: 5, proficiency: SkillProficiency.EXPERT },
        { name: 'Drilling Operations', yearsOfExp: 4, proficiency: SkillProficiency.PROFICIENT },
        { name: 'Safety & Risk Assessment', yearsOfExp: 5, proficiency: SkillProficiency.PROFICIENT },
        { name: 'First Aid', yearsOfExp: 3, proficiency: SkillProficiency.INTERMEDIATE },
      ],
      experience: [
        { jobTitle: 'Underground Miner', employer: 'Asanko Gold Mine', startDate: new Date('2018-03-01'), endDate: new Date('2022-06-30'), description: 'Operated drilling equipment in underground tunnels. Led safety briefings for 8-person crew.' },
        { jobTitle: 'Mining Assistant', employer: 'Chirano Gold Mines', startDate: new Date('2016-01-01'), endDate: new Date('2018-02-28'), description: 'Assisted in ore extraction and equipment maintenance.' },
      ],
    },
    {
      email: 'ama.boateng@gmail.com',
      phone: '+233244100002',
      fullName: 'Ama Boateng',
      communityIdx: 1,
      verificationStatus: VerificationStatus.VERIFIED,
      bio: 'Process plant operator with CIL and ball mill experience',
      skills: [
        { name: 'Ore Processing', yearsOfExp: 6, proficiency: SkillProficiency.EXPERT },
        { name: 'Ball Mill Operation', yearsOfExp: 4, proficiency: SkillProficiency.PROFICIENT },
        { name: 'Environmental Compliance', yearsOfExp: 3, proficiency: SkillProficiency.INTERMEDIATE },
        { name: 'Technical Reporting', yearsOfExp: 5, proficiency: SkillProficiency.PROFICIENT },
      ],
      experience: [
        { jobTitle: 'Process Plant Operator', employer: 'AngloGold Ashanti Obuasi', startDate: new Date('2017-05-01'), endDate: null, description: 'Operates CIL circuit and ball mills. Prepares daily shift reports. Monitors reagent dosage.', isCurrent: true },
      ],
    },
    {
      email: 'kofi.mensah@gmail.com',
      phone: '+233244100003',
      fullName: 'Kofi Mensah',
      communityIdx: 0,
      verificationStatus: VerificationStatus.YOUTH_APPROVED,
      bio: 'Heavy equipment operator seeking advancement in open-pit mining',
      skills: [
        { name: 'Heavy Equipment Operation', yearsOfExp: 3, proficiency: SkillProficiency.PROFICIENT },
        { name: 'Dump Truck Operation', yearsOfExp: 3, proficiency: SkillProficiency.PROFICIENT },
        { name: 'Open-Pit Mining', yearsOfExp: 2, proficiency: SkillProficiency.INTERMEDIATE },
      ],
      experience: [
        { jobTitle: 'Dump Truck Operator', employer: 'Bibiani Gold Mine', startDate: new Date('2020-07-01'), endDate: new Date('2023-06-30'), description: 'Operated 120-tonne Caterpillar 777 dump truck in open-pit operations.' },
      ],
    },
    {
      email: 'abena.sarpong@gmail.com',
      phone: '+233244100004',
      fullName: 'Abena Sarpong',
      communityIdx: 2,
      verificationStatus: VerificationStatus.PENDING,
      bio: 'Mechanical technician with mining equipment maintenance experience',
      skills: [
        { name: 'Mechanical Maintenance', yearsOfExp: 4, proficiency: SkillProficiency.PROFICIENT },
        { name: 'Welding', yearsOfExp: 2, proficiency: SkillProficiency.INTERMEDIATE },
        { name: 'Electrical Maintenance', yearsOfExp: 1, proficiency: SkillProficiency.BEGINNER },
      ],
      experience: [
        { jobTitle: 'Mechanical Technician', employer: 'Goldfields Ghana', startDate: new Date('2019-01-01'), endDate: new Date('2023-12-31'), description: 'Maintained conveyor belts, crushers, and ancillary equipment.' },
      ],
    },
  ];

  for (const applicantData of applicantsData) {
    const user = await prisma.user.upsert({
      where: { email: applicantData.email },
      update: {},
      create: {
        email: applicantData.email,
        phone: applicantData.phone,
        passwordHash: await bcrypt.hash('Applicant@123', 12),
        role: UserRole.APPLICANT,
      },
    });

    const profile = await prisma.applicantProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        fullName: applicantData.fullName,
        communityId: communities[applicantData.communityIdx].id,
        verificationStatus: applicantData.verificationStatus,
        bio: applicantData.bio,
      },
    });

    // Skills
    for (const skillData of applicantData.skills) {
      const skill = skillMap[skillData.name];
      if (skill) {
        await prisma.applicantSkill.upsert({
          where: { applicantId_skillId: { applicantId: profile.id, skillId: skill.id } },
          update: {},
          create: {
            applicantId: profile.id,
            skillId: skill.id,
            yearsOfExp: skillData.yearsOfExp,
            proficiency: skillData.proficiency,
          },
        });
      }
    }

    // Experience
    for (const exp of applicantData.experience) {
      await prisma.workExperience.create({
        data: {
          applicantId: profile.id,
          jobTitle: exp.jobTitle,
          employer: exp.employer,
          startDate: exp.startDate,
          endDate: exp.endDate || null,
          isCurrent: (exp as any).isCurrent || false,
          description: exp.description,
        },
      });
    }

    // Verification requests for non-pending
    if (applicantData.verificationStatus !== VerificationStatus.PENDING) {
      const verReq = await prisma.verificationRequest.create({
        data: {
          applicantId: profile.id,
          status: applicantData.verificationStatus,
          submittedAt: new Date('2024-01-15'),
        },
      });

      if ([VerificationStatus.YOUTH_APPROVED, VerificationStatus.CHIEF_CONFIRMED, VerificationStatus.VERIFIED].includes(applicantData.verificationStatus)) {
        const communityYP = applicantData.communityIdx === 0 ? yp1 : yp2;
        await prisma.youthVerification.create({
          data: {
            requestId: verReq.id,
            youthPresidentId: communityYP.id,
            decision: VerificationStatus.YOUTH_APPROVED,
            notes: 'Confirmed community member. Known family in the area.',
            decisionAt: new Date('2024-01-20'),
          },
        });
      }

      if (applicantData.verificationStatus === VerificationStatus.VERIFIED) {
        await prisma.chiefConfirmation.create({
          data: {
            requestId: verReq.id,
            confirmingStaffId: chiefStaff.id,
            status: VerificationStatus.CHIEF_CONFIRMED,
            chiefName: applicantData.communityIdx === 0 ? 'Nana Akuamoah III' : 'Nana Boateng II',
            notes: 'Chief confirmed via phone on 22nd January. Applicant is a bona fide community member.',
            confirmedAt: new Date('2024-01-22'),
          },
        });
      }
    }
  }

  console.log(`✅ Created ${applicantsData.length} applicants with profiles, skills, experience, and verification`);

  // ── JOBS ──────────────────────────────────────────────────────────────────────
  const job1 = await prisma.job.create({
    data: {
      postedById: hrUser.id,
      title: 'Underground Mine Operator',
      description: 'We are seeking experienced underground mine operators for our Level 8–12 operations. The role requires proficiency in drill-and-blast methods and strict adherence to our safety management system.',
      scope: 'Operate drilling equipment in underground headings. Conduct pre-shift inspections. Participate in blast preparation and execution under supervision of a Blasting Certificate holder. Maintain equipment usage logs.',
      responsibilities: 'Drilling operations in designated headings. Pre/post-shift safety checks. Ground support installation. Housekeeping of work area. Incident reporting.',
      minExperience: 3,
      status: JobStatus.OPEN,
      applicationDeadline: new Date('2025-03-31'),
      requirements: {
        create: [
          { skillId: skillMap['Underground Mining'].id, isMandatory: true, minYears: 3 },
          { skillId: skillMap['Drilling Operations'].id, isMandatory: true, minYears: 2 },
          { skillId: skillMap['Safety & Risk Assessment'].id, isMandatory: true, minYears: 2 },
          { skillId: skillMap['First Aid'].id, isMandatory: false, minYears: 0 },
        ],
      },
      eligibleCommunities: {
        create: [
          { communityId: communities[0].id },
          { communityId: communities[1].id },
        ],
      },
      requiredDocTypes: {
        create: [
          { docType: DocumentType.CV_RESUME, label: 'Current CV / Resume', required: true },
          { docType: DocumentType.LICENSE, label: 'Valid Blasting Certificate (if held)', required: false },
          { docType: DocumentType.CERTIFICATE, label: 'First Aid Certificate', required: false },
          { docType: DocumentType.CERTIFICATE, label: 'Safety Training Certificate', required: true },
        ],
      },
    },
  });

  const job2 = await prisma.job.create({
    data: {
      postedById: hrUser.id,
      title: 'Process Plant Operator – CIL Circuit',
      description: 'Operate the Carbon-in-Leach circuit and associated ball mill installations at our processing facility. This role is central to meeting our daily gold recovery targets.',
      scope: 'Monitor and control CIL circuit parameters. Operate ball mill grinding circuit. Conduct reagent additions (lime, NaCN) per prescribed dosage rates. Log all parameters in SCADA system and paper shift records.',
      responsibilities: 'Hourly circuit inspections. Reagent dosage monitoring. Sample collection for lab analysis. Equipment start-up and shut-down procedures. Shift handover reports.',
      minExperience: 4,
      status: JobStatus.OPEN,
      applicationDeadline: new Date('2025-04-15'),
      requirements: {
        create: [
          { skillId: skillMap['Ore Processing'].id, isMandatory: true, minYears: 4 },
          { skillId: skillMap['Ball Mill Operation'].id, isMandatory: true, minYears: 2 },
          { skillId: skillMap['Environmental Compliance'].id, isMandatory: true, minYears: 1 },
          { skillId: skillMap['Technical Reporting'].id, isMandatory: false, minYears: 0 },
        ],
      },
      eligibleCommunities: {
        create: [
          { communityId: communities[1].id },
          { communityId: communities[2].id },
        ],
      },
      requiredDocTypes: {
        create: [
          { docType: DocumentType.CV_RESUME, label: 'Current CV / Resume', required: true },
          { docType: DocumentType.CERTIFICATE, label: 'Process Plant Operations Certificate', required: true },
          { docType: DocumentType.CERTIFICATE, label: 'Reagent Handling Safety Certificate', required: false },
        ],
      },
    },
  });

  const job3 = await prisma.job.create({
    data: {
      postedById: hrUser.id,
      title: 'Heavy Equipment Operator – Open Pit',
      description: 'Operate large mining fleet equipment in our open-pit operation. Candidates must hold a valid site equipment licence for 60-tonne and above class machinery.',
      scope: 'Operate Caterpillar 777 dump trucks and Komatsu PC1250 excavators in open-pit. Follow mine plan instructions from shift supervisors. Conduct pre-operational checks and maintain daily equipment logs.',
      responsibilities: 'Haul material from pit to ROM pad per dispatch instructions. Excavation support as required. Pre/post-shift equipment inspections. Fuel log maintenance.',
      minExperience: 2,
      status: JobStatus.OPEN,
      applicationDeadline: new Date('2025-04-30'),
      requirements: {
        create: [
          { skillId: skillMap['Heavy Equipment Operation'].id, isMandatory: true, minYears: 2 },
          { skillId: skillMap['Dump Truck Operation'].id, isMandatory: true, minYears: 1 },
          { skillId: skillMap['Open-Pit Mining'].id, isMandatory: false, minYears: 0 },
          { skillId: skillMap['Safety & Risk Assessment'].id, isMandatory: true, minYears: 1 },
        ],
      },
      eligibleCommunities: {
        create: [
          { communityId: communities[0].id },
          { communityId: communities[1].id },
          { communityId: communities[2].id },
        ],
      },
      requiredDocTypes: {
        create: [
          { docType: DocumentType.CV_RESUME, label: 'Current CV / Resume', required: true },
          { docType: DocumentType.LICENSE, label: 'Valid Heavy Equipment Operator Licence', required: true },
          { docType: DocumentType.CERTIFICATE, label: 'Defensive Driving Certificate', required: false },
        ],
      },
    },
  });

  console.log(`✅ Created 3 job postings (underground operator, process plant, heavy equipment)`);

  // ── SAMPLE APPLICATION ─────────────────────────────────────────────────────
  const kwameProfile = await prisma.applicantProfile.findFirst({ where: { fullName: 'Kwame Asante' } });
  if (kwameProfile) {
    await prisma.application.create({
      data: {
        jobId: job1.id,
        applicantId: kwameProfile.id,
        status: ApplicationStatus.UNDER_REVIEW,
        coverNote: 'I am very interested in this role and believe my 5 years of underground mining experience at Asanko Gold Mine makes me a strong candidate.',
        submittedAt: new Date('2024-02-01'),
        documents: {
          create: [
            {
              docType: DocumentType.CV_RESUME,
              label: 'CV / Resume',
              fileName: 'kwame_asante_cv.pdf',
              originalName: 'Kwame Asante CV 2024.pdf',
              storagePath: '/uploads/mock/kwame_asante_cv.pdf',
              fileSize: 245000,
              mimeType: 'application/pdf',
            },
            {
              docType: DocumentType.CERTIFICATE,
              label: 'Safety Training Certificate',
              fileName: 'kwame_safety_cert.pdf',
              originalName: 'Safety Certificate.pdf',
              storagePath: '/uploads/mock/kwame_safety_cert.pdf',
              fileSize: 120000,
              mimeType: 'application/pdf',
            },
          ],
        },
      },
    });
  }

  const amaProfile = await prisma.applicantProfile.findFirst({ where: { fullName: 'Ama Boateng' } });
  if (amaProfile) {
    await prisma.application.create({
      data: {
        jobId: job2.id,
        applicantId: amaProfile.id,
        status: ApplicationStatus.SUBMITTED,
        coverNote: 'Six years as a process plant operator at AngloGold Ashanti makes this role a natural progression for me.',
        submittedAt: new Date('2024-02-05'),
        documents: {
          create: [
            {
              docType: DocumentType.CV_RESUME,
              label: 'CV / Resume',
              fileName: 'ama_boateng_cv.pdf',
              originalName: 'Ama Boateng CV.pdf',
              storagePath: '/uploads/mock/ama_boateng_cv.pdf',
              fileSize: 198000,
              mimeType: 'application/pdf',
            },
          ],
        },
      },
    });
  }

  console.log('✅ Created sample applications');
  console.log('\n🎉 Seed complete! Default credentials:');
  console.log('   Admin:       admin@miningco.gh     / Admin@1234');
  console.log('   HR Officer:  hr@miningco.gh        / Hr@12345');
  console.log('   Youth Pres:  yp.kotoku@gmail.com   / Youth@123');
  console.log('   Chief Staff: chiefstaff@miningco.gh/ Chief@123');
  console.log('   Applicants:  kwame.asante@gmail.com/ Applicant@123');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
