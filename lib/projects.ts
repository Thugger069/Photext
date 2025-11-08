// lib/projects.ts
import { db } from "./db";
import type { BoxState, ProjectDto, Platform } from "@/types/photext";

/**
 * Create a new project for authenticated or guest users
 */
export async function createProject(params: {
  userId?: string | null;
  guestKey?: string | null;
  title?: string;
  imagePath: string;
  boxes: BoxState[];
}): Promise<ProjectDto> {
  const project = await db.project.create({
    data: {
      userId: params.userId ?? null,
      guestKey: params.guestKey ?? null,
      title: params.title ?? "Untitled Project",
      imagePath: params.imagePath,
      boxes: params.boxes as any,
    },
  });

  return projectToDto(project);
}

/**
 * Get a project by ID, optionally filtering by userId or guestKey
 */
export async function getProjectById(
  id: string,
  options?: {
    userId?: string | null;
    guestKey?: string | null;
  }
): Promise<ProjectDto | null> {
  const where: any = { id };

  // Add userId or guestKey filter if provided
  if (options?.userId) {
    where.userId = options.userId;
  } else if (options?.guestKey) {
    where.guestKey = options.guestKey;
  }

  const project = await db.project.findFirst({
    where,
  });

  if (!project) return null;

  return projectToDto(project);
}

/**
 * List all projects for a user (or guest)
 */
export async function listProjectsForUser(params: {
  userId?: string | null;
  guestKey?: string | null;
  limit?: number;
  offset?: number;
}): Promise<ProjectDto[]> {
  const where: any = {};

  if (params.userId) {
    where.userId = params.userId;
  } else if (params.guestKey) {
    where.guestKey = params.guestKey;
  } else {
    // Must specify either userId or guestKey
    return [];
  }

  const projects = await db.project.findMany({
    where,
    orderBy: {
      updatedAt: "desc",
    },
    take: params.limit ?? 50,
    skip: params.offset ?? 0,
  });

  return projects.map(projectToDto);
}

/**
 * Update a project's canvas state and metadata
 */
export async function updateProject(params: {
  id: string;
  title?: string;
  boxes?: BoxState[];
  dominantLanguage?: string | null;
  lastPlatforms?: Platform[];
  lastGeneratedPosts?: any;
  lastGeneratedHashtags?: any;
  userId?: string | null;
  guestKey?: string | null;
}): Promise<ProjectDto> {
  const where: any = { id: params.id };

  // Security: ensure the caller owns this project
  if (params.userId) {
    where.userId = params.userId;
  } else if (params.guestKey) {
    where.guestKey = params.guestKey;
  }

  const data: any = {
    updatedAt: new Date(),
  };

  if (params.title !== undefined) data.title = params.title;
  if (params.boxes !== undefined) data.boxes = params.boxes as any;
  if (params.dominantLanguage !== undefined)
    data.dominantLanguage = params.dominantLanguage;
  if (params.lastPlatforms !== undefined)
    data.lastPlatforms = params.lastPlatforms.join(",");
  if (params.lastGeneratedPosts !== undefined)
    data.lastGeneratedPosts = params.lastGeneratedPosts;
  if (params.lastGeneratedHashtags !== undefined)
    data.lastGeneratedHashtags = params.lastGeneratedHashtags;

  const project = await db.project.update({
    where,
    data,
  });

  return projectToDto(project);
}

/**
 * Delete a project by ID
 */
export async function deleteProject(params: {
  id: string;
  userId?: string | null;
  guestKey?: string | null;
}): Promise<boolean> {
  const where: any = { id: params.id };

  // Security: ensure the caller owns this project
  if (params.userId) {
    where.userId = params.userId;
  } else if (params.guestKey) {
    where.guestKey = params.guestKey;
  }

  try {
    await db.project.delete({ where });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Increment AI usage counters for a project and its user
 */
export async function incrementAiUsage(params: {
  projectId: string;
  type: "rewrite" | "grammarFix" | "postGeneration" | "hashtagSuggestion";
  count?: number;
}): Promise<void> {
  const count = params.count ?? 1;

  // Get the project to find its userId
  const project = await db.project.findUnique({
    where: { id: params.projectId },
    select: { userId: true },
  });

  if (!project) return;

  // Update project counters
  const projectUpdateData: any = {};
  const userUpdateData: any = {};

  switch (params.type) {
    case "rewrite":
      projectUpdateData.aiRewriteCount = { increment: count };
      userUpdateData.aiTotalRewriteCount = { increment: count };
      break;
    case "grammarFix":
      projectUpdateData.aiGrammarFixCount = { increment: count };
      userUpdateData.aiTotalGrammarFixCount = { increment: count };
      break;
    case "postGeneration":
      projectUpdateData.aiPostGenerationCount = { increment: count };
      userUpdateData.aiTotalPostGenerationCount = { increment: count };
      break;
    case "hashtagSuggestion":
      projectUpdateData.aiHashtagSuggestionCount = { increment: count };
      userUpdateData.aiTotalHashtagSuggestionCount = { increment: count };
      break;
  }

  // Update project
  await db.project.update({
    where: { id: params.projectId },
    data: projectUpdateData,
  });

  // Update user if authenticated
  if (project.userId) {
    await db.user.update({
      where: { id: project.userId },
      data: userUpdateData,
    });
  }
}

/**
 * Helper to convert Prisma Project model to ProjectDto
 */
function projectToDto(project: any): ProjectDto {
  return {
    id: project.id,
    title: project.title,
    imagePath: project.imagePath,
    boxes: project.boxes as unknown as BoxState[],
    dominantLanguage: project.dominantLanguage,
    lastPlatforms: project.lastPlatforms
      ? (project.lastPlatforms.split(",").filter(Boolean) as Platform[])
      : undefined,
    aiRewriteCount: project.aiRewriteCount,
    aiGrammarFixCount: project.aiGrammarFixCount,
    aiPostGenerationCount: project.aiPostGenerationCount,
    aiHashtagSuggestionCount: project.aiHashtagSuggestionCount,
    lastGeneratedPosts: project.lastGeneratedPosts as any,
    lastGeneratedHashtags: project.lastGeneratedHashtags as any,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}
