import { describeInsightsRepositoryContract } from "@/server/insights/insights-repository.contract";
import { InMemoryInsightsRepository } from "./in-memory-insights-repository";

describeInsightsRepositoryContract("InMemoryInsightsRepository", async () => {
  const repository = new InMemoryInsightsRepository();
  return { repository, seed: async (employees) => repository.add(employees) };
});
