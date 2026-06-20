import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // DATABASE_URL: cadena pooled (pgBouncer) — para runtime y migrate en Prisma 7
    // DIRECT_URL:   cadena directa — usado para migrate en versiones anteriores
    // En Prisma 7 la URL directa se configura aquí bajo `url` para migraciones
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
  },
});
