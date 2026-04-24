import "dotenv/config";
import prismaClientPkg from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { PrismaClient } = prismaClientPkg;
const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

if (!connectionString || typeof connectionString !== "string") {
  throw new Error("DATABASE_URL is missing or invalid in environment variables");
}

const pool = new Pool({ connectionString });

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export default prisma;
