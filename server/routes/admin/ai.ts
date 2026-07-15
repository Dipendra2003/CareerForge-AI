import { Router } from 'express';
import prisma from '../../lib/prisma';
import { logAdminAction } from '../../utils/auditLogger';
import { AIManager } from '../../services/ai/AIManager';

const aiRouter = Router();

// Ensure AI settings exist
const getOrCreateAISettings = async () => {
  let settings = await prisma.aISetting.findFirst();
  if (!settings) {
    settings = await prisma.aISetting.create({ data: {} });
  }
  return settings;
};

aiRouter.get('/', async (req, res) => {
  try {
    const settings = await getOrCreateAISettings();
    const prompts = await prisma.aIPrompt.findMany({
      orderBy: { name: 'asc' }
    });
    res.json({ settings, prompts });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch AI settings' });
  }
});

aiRouter.get('/models', async (req, res) => {
  try {
    const aiManager = await AIManager.getInstance();
    const models = await aiManager.providerManager.discoverAllModels();
    res.json(models);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch available models.' });
  }
});

// Health Route
aiRouter.get('/health', async (req, res) => {
  try {
    const aiManager = await AIManager.getInstance();
    const models = await aiManager.providerManager.discoverAllModels();
    const health = aiManager.healthManager.getAllHealth();
    
    res.json({
      cache: aiManager.providerManager.getCacheStatus(),
      models: models.map(m => m.name),
      health
    });
  } catch(e) {
    res.status(500).json({ error: 'Failed to fetch health' });
  }
});

aiRouter.put('/', async (req, res) => {
  try {
    const settings = await getOrCreateAISettings();
    const updateData = req.body;

    const updatedSettings = await prisma.aISetting.update({
      where: { id: settings.id },
      data: {
        geminiModel: updateData.geminiModel,
        temperature: updateData.temperature,
        topP: updateData.topP,
        topK: updateData.topK,
        maxTokens: updateData.maxTokens,
        retryCount: updateData.retryCount,
        timeout: updateData.timeout,
        enableFailover: updateData.enableFailover,
        failoverRetryCount: updateData.failoverRetryCount,
        failoverCooldownMins: updateData.failoverCooldownMins,
        healthCheckIntervalMins: updateData.healthCheckIntervalMins,
        autoRecovery: updateData.autoRecovery,
        autoDiscovery: updateData.autoDiscovery,
        preferredModel: updateData.preferredModel,
        isAtsEnabled: updateData.isAtsEnabled,
        isCoverLetterEnabled: updateData.isCoverLetterEnabled,
        isBulletRewriterEnabled: updateData.isBulletRewriterEnabled,
        isLinkedinEnabled: updateData.isLinkedinEnabled,
        isInterviewEnabled: updateData.isInterviewEnabled,
        enableLogging: updateData.enableLogging,
        enablePromptHistory: updateData.enablePromptHistory,
      }
    });

    await logAdminAction(req, 'Update AI Settings', updateData);
    res.json({ settings: updatedSettings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update AI settings' });
  }
});

aiRouter.get('/prompts', async (req, res) => {
  try {
    const prompts = await prisma.aIPrompt.findMany({ orderBy: { name: 'asc' } });
    res.json({ prompts });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch prompts' });
  }
});

aiRouter.post('/prompts', async (req, res) => {
  try {
    const { name, slug, content, description, isActive } = req.body;
    const prompt = await prisma.aIPrompt.create({
      data: {
        name,
        slug,
        content,
        description,
        isActive,
        updatedBy: (req as any).user?.email || 'Admin',
      }
    });
    
    await logAdminAction(req, 'Create Prompt', null, null, slug);
    res.json({ prompt });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create prompt' });
  }
});

aiRouter.put('/prompts/:id', async (req, res) => {
  try {
    const { name, slug, content, description, isActive } = req.body;
    const oldPrompt = await prisma.aIPrompt.findUnique({ where: { id: req.params.id } });
    if (!oldPrompt) return res.status(404).json({ error: 'Not found' });
    
    const version = oldPrompt.content !== content ? oldPrompt.version + 1 : oldPrompt.version;
    
    const prompt = await prisma.aIPrompt.update({
      where: { id: req.params.id },
      data: {
        name,
        slug,
        content,
        description,
        isActive,
        version,
        updatedBy: (req as any).user?.email || 'Admin',
      }
    });
    
    await logAdminAction(req, 'Update Prompt', null, null, slug);
    res.json({ prompt });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update prompt' });
  }
});

aiRouter.delete('/prompts/:id', async (req, res) => {
  try {
    const prompt = await prisma.aIPrompt.delete({ where: { id: req.params.id } });
    await logAdminAction(req, 'Delete Prompt', null, null, prompt.slug);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete prompt' });
  }
});

// Test Prompt Route
aiRouter.post('/test', async (req, res) => {
  try {
    const { resumeText, jobDescription, promptContent } = req.body;
    if (!resumeText || !promptContent) {
      return res.status(400).json({ error: 'Missing required test fields' });
    }
    
    const aiManager = await AIManager.getInstance();
    const settings = await getOrCreateAISettings();
    
    const fullPrompt = promptContent
      .replace("{{jobDescription}}", jobDescription || "")
      .replace("{{resumeText}}", resumeText || "");

    const responseText = await aiManager.generateContent(fullPrompt, {
      systemInstruction: settings.systemPrompt || "",
      temperature: settings.temperature,
      topP: settings.topP,
      maxTokens: settings.maxTokens || undefined
    });
    
    res.json({ result: responseText });
  } catch (error: any) {
    console.error("Test prompt error:", error);
    res.status(500).json({ error: error.message || 'Failed to test prompt' });
  }
});

export default aiRouter;
