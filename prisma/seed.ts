import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const sharedPattern = process.env.SHARED_PATTERN || process.env.USER1_PATTERN || "3-6-4-2"; // Shared Master Pattern Lock for both users
  const user1Username = process.env.USER1_USERNAME || "t";
  const user1Pattern = sharedPattern;
  const user1DisplayName = process.env.USER1_DISPLAY_NAME || "T";

  const user2Username = process.env.USER2_USERNAME || "adesh";
  const user2Pattern = sharedPattern;
  const user2DisplayName = process.env.USER2_DISPLAY_NAME || "Adesh";

  const saltRounds = 12;

  // Hash pattern sequences
  const user1PasswordHash = await bcrypt.hash(user1Pattern, saltRounds);
  const user2PasswordHash = await bcrypt.hash(user2Pattern, saltRounds);

  // Delete legacy users and old sessions that are not user1 or user2
  await prisma.session.deleteMany({});
  await prisma.user.deleteMany({
    where: {
      username: {
        notIn: [user1Username, user2Username],
      },
    },
  });

  // Idempotently upsert User 1
  const user1 = await prisma.user.upsert({
    where: { username: user1Username },
    update: {
      displayName: user1DisplayName,
      passwordHash: user1PasswordHash,
    },
    create: {
      username: user1Username,
      displayName: user1DisplayName,
      passwordHash: user1PasswordHash,
    },
  });

  // Idempotently upsert User 2
  const user2 = await prisma.user.upsert({
    where: { username: user2Username },
    update: {
      displayName: user2DisplayName,
      passwordHash: user2PasswordHash,
    },
    create: {
      username: user2Username,
      displayName: user2DisplayName,
      passwordHash: user2PasswordHash,
    },
  });

  // Idempotently upsert default Conversation
  const conversation = await prisma.conversation.upsert({
    where: { id: "default-private-chat" },
    update: {},
    create: {
      id: "default-private-chat",
    },
  });

  console.log(
    `[Seed Success] Seeded pattern lock users: "${user1.username}", "${user2.username}" and conversation ID: "${conversation.id}"`
  );
}

main()
  .catch((e) => {
    console.error("[Seed Error]", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
