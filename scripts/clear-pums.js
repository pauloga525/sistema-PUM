const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.planAuditEvent.deleteMany({});
  await prisma.planReview.deleteMany({});
  await prisma.planificationRow.deleteMany({});
  await prisma.planificationTeacher.deleteMany({});
  await prisma.planification.deleteMany({});
  console.log('Todos los PUM eliminados correctamente.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
