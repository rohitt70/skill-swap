import { PrismaClient, UserRole, SkillType, ProficiencyLevel } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding SkillSwap Database ---');

  // Common password hash for test accounts: Password123!
  const passwordHash = await argon2.hash('Password123!', {
    type: argon2.argon2id,
  });

  // 1. Seed Skills Catalog
  console.log('Seeding skills catalog...');
  const skillsData = [
    { name: 'Python Programming', category: 'Computer Science', description: 'Backend development, data analysis, scripting' },
    { name: 'Graphic Design', category: 'Design & Arts', description: 'Figma, UI/UX, brand identity, vector illustration' },
    { name: 'Calculus & Linear Algebra', category: 'Mathematics', description: 'Derivatives, integrals, matrix operations' },
    { name: 'React & Next.js', category: 'Web Development', description: 'Modern frontend development, hooks, SSR' },
    { name: 'Public Speaking', category: 'Communication', description: 'Presentation skills, pitching, debate' },
    { name: 'Spanish Fluency', category: 'Languages', description: 'Conversational practice and grammar' },
    { name: 'Machine Learning', category: 'Data Science', description: 'PyTorch, scikit-learn, neural networks' },
  ];

  const createdSkills: Record<string, any> = {};
  for (const s of skillsData) {
    const skill = await prisma.skill.upsert({
      where: { name: s.name },
      update: {},
      create: s,
    });
    createdSkills[s.name] = skill;
  }

  // 2. Seed Demo Students
  console.log('Seeding student accounts...');

  // Student 1: Alice (Teaches Python, wants Graphic Design)
  const alice = await prisma.user.upsert({
    where: { email: 'alice@university.edu' },
    update: {},
    create: {
      email: 'alice@university.edu',
      passwordHash,
      role: UserRole.STUDENT,
      isVerified: true,
      profile: {
        create: {
          displayName: 'Alice Chen',
          headline: 'CS Junior @ MIT | Python & Algorithmic Design Enthusiast',
          institution: 'MIT',
          major: 'Computer Science',
          graduationYear: 2026,
          location: 'Cambridge, MA',
          bio: 'Passionate about Python & algorithms. Looking to learn Figma and graphic design for open-source user interfaces!',
          portfolioUrl: 'https://github.com/alicechen',
          availability: 'Mon/Wed/Fri evenings',
          reputationScore: 4.9,
        },
      },
      settings: {
        create: {
          theme: 'SYSTEM',
          isProfilePublic: true,
          showSocialLinks: true,
          showEmail: false,
          showAvailability: true,
          showInstitution: true,
        },
      },
    },
  });

  // Social link for Alice
  await prisma.socialLink.upsert({
    where: { userId_platform: { userId: alice.id, platform: 'GITHUB' } },
    update: {},
    create: { userId: alice.id, platform: 'GITHUB', url: 'https://github.com/alicechen' },
  });
  await prisma.socialLink.upsert({
    where: { userId_platform: { userId: alice.id, platform: 'LINKEDIN' } },
    update: {},
    create: { userId: alice.id, platform: 'LINKEDIN', url: 'https://linkedin.com/in/alicechen' },
  });

  // Student 2: Bob (Teaches Graphic Design, wants Python)
  const bob = await prisma.user.upsert({
    where: { email: 'bob@university.edu' },
    update: {},
    create: {
      email: 'bob@university.edu',
      passwordHash,
      role: UserRole.STUDENT,
      isVerified: true,
      profile: {
        create: {
          displayName: 'Bob Rivera',
          headline: 'Interaction Designer @ RISD | Exploring Python & Generative Art',
          institution: 'RISD / Brown',
          major: 'Interaction Design',
          graduationYear: 2025,
          location: 'Providence, RI',
          bio: 'Designer crafting digital experiences. Really keen to understand Python for creative coding and AI creative workflows!',
          portfolioUrl: 'https://bobrivera.design',
          availability: 'Weekends & Tuesdays',
          reputationScore: 5.0,
        },
      },
      settings: {
        create: {
          theme: 'LIGHT',
          isProfilePublic: true,
          showSocialLinks: true,
          showEmail: false,
          showAvailability: true,
          showInstitution: true,
        },
      },
    },
  });

  // Social links for Bob
  await prisma.socialLink.upsert({
    where: { userId_platform: { userId: bob.id, platform: 'PORTFOLIO' } },
    update: {},
    create: { userId: bob.id, platform: 'PORTFOLIO', url: 'https://bobrivera.design' },
  });
  await prisma.socialLink.upsert({
    where: { userId_platform: { userId: bob.id, platform: 'LINKEDIN' } },
    update: {},
    create: { userId: bob.id, platform: 'LINKEDIN', url: 'https://linkedin.com/in/bobrivera' },
  });

  // Student 3: Charlie (Admin & Math Tutor)
  const charlie = await prisma.user.upsert({
    where: { email: 'charlie@university.edu' },
    update: {},
    create: {
      email: 'charlie@university.edu',
      passwordHash,
      role: UserRole.ADMIN,
      isVerified: true,
      profile: {
        create: {
          displayName: 'Charlie Kim',
          headline: 'Applied Math Researcher @ Stanford | Peer Tutor',
          institution: 'Stanford',
          major: 'Applied Mathematics',
          graduationYear: 2024,
          location: 'Palo Alto, CA',
          bio: 'Math tutor and peer mentor. Happy to help anyone mastering Calculus, Linear Algebra, or mathematical modeling.',
          availability: 'Flexible daytime',
          reputationScore: 4.8,
        },
      },
      settings: {
        create: {
          theme: 'DARK',
          isProfilePublic: true,
          showSocialLinks: true,
          showEmail: false,
          showAvailability: true,
          showInstitution: true,
        },
      },
    },
  });

  // 3. Assign Skills
  console.log('Assigning student skills...');
  // Alice teaches Python, learns Graphic Design
  await prisma.userSkill.upsert({
    where: { userId_skillId_type: { userId: alice.id, skillId: createdSkills['Python Programming'].id, type: SkillType.TEACH } },
    update: {},
    create: { userId: alice.id, skillId: createdSkills['Python Programming'].id, type: SkillType.TEACH, proficiencyLevel: ProficiencyLevel.ADVANCED },
  });
  await prisma.userSkill.upsert({
    where: { userId_skillId_type: { userId: alice.id, skillId: createdSkills['Graphic Design'].id, type: SkillType.LEARN } },
    update: {},
    create: { userId: alice.id, skillId: createdSkills['Graphic Design'].id, type: SkillType.LEARN, proficiencyLevel: ProficiencyLevel.BEGINNER },
  });

  // Bob teaches Graphic Design, learns Python
  await prisma.userSkill.upsert({
    where: { userId_skillId_type: { userId: bob.id, skillId: createdSkills['Graphic Design'].id, type: SkillType.TEACH } },
    update: {},
    create: { userId: bob.id, skillId: createdSkills['Graphic Design'].id, type: SkillType.TEACH, proficiencyLevel: ProficiencyLevel.EXPERT },
  });
  await prisma.userSkill.upsert({
    where: { userId_skillId_type: { userId: bob.id, skillId: createdSkills['Python Programming'].id, type: SkillType.LEARN } },
    update: {},
    create: { userId: bob.id, skillId: createdSkills['Python Programming'].id, type: SkillType.LEARN, proficiencyLevel: ProficiencyLevel.BEGINNER },
  });

  // Charlie teaches Calculus
  await prisma.userSkill.upsert({
    where: { userId_skillId_type: { userId: charlie.id, skillId: createdSkills['Calculus & Linear Algebra'].id, type: SkillType.TEACH } },
    update: {},
    create: { userId: charlie.id, skillId: createdSkills['Calculus & Linear Algebra'].id, type: SkillType.TEACH, proficiencyLevel: ProficiencyLevel.EXPERT },
  });

  // 4. Create friendship between Alice & Bob
  console.log('Establishing demo friendship...');
  const [u1, u2] = alice.id < bob.id ? [alice.id, bob.id] : [bob.id, alice.id];
  await prisma.friendship.upsert({
    where: { userAId_userBId: { userAId: u1, userBId: u2 } },
    update: {},
    create: { userAId: u1, userBId: u2 },
  });

  // 5. Create conversation & initial messages
  console.log('Creating demo conversation & messages...');
  let conv = await prisma.conversation.findFirst({
    where: {
      isGroup: false,
      AND: [
        { participants: { some: { userId: alice.id } } },
        { participants: { some: { userId: bob.id } } },
      ],
    },
  });

  if (!conv) {
    conv = await prisma.conversation.create({
      data: {
        isGroup: false,
        participants: {
          create: [{ userId: alice.id }, { userId: bob.id }],
        },
      },
    });
  }

  // Active chat session
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  const existingSession = await prisma.chatSession.findFirst({
    where: { conversationId: conv.id },
  });

  if (!existingSession) {
    await prisma.chatSession.create({
      data: {
        conversationId: conv.id,
        status: 'ACTIVE',
        startedAt: new Date(),
        lastActivityAt: new Date(),
        expiresAt,
      },
    });
  }

  const existingMsg = await prisma.message.findFirst({
    where: { conversationId: conv.id },
  });

  if (!existingMsg) {
    await prisma.message.createMany({
      data: [
        {
          conversationId: conv.id,
          senderId: alice.id,
          content: 'Hi Bob! I saw you teach Graphic Design. I would love to exchange Python tutoring for design feedback!',
        },
        {
          conversationId: conv.id,
          senderId: bob.id,
          content: "Hey Alice, that's perfect! I have been struggling with a Python web scraping script. Let's arrange a session!",
        },
      ],
    });
  }

  console.log('--- SkillSwap Database Seed Completed Successfully! ---');
  console.log('Demo Login Accounts:');
  console.log('  1. alice@university.edu (Password: Password123!)');
  console.log('  2. bob@university.edu   (Password: Password123!)');
  console.log('  3. charlie@university.edu [Admin] (Password: Password123!)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
