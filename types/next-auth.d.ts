// types/next-auth.d.ts
import { BillingPlan } from "@prisma/client";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      billingPlan: BillingPlan;
    } & DefaultSession["user"];
  }
}
