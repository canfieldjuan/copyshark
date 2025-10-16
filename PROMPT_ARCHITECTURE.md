# CopyShark Prompt Architecture & Taxonomy System

## 📍 Where Copy Generation Happens

### Main Flow
```
User Request → Controller → copy.service.js → llmService.js → OpenAI API → Generated Copy
```

### Key Files

#### 1. **`/src/services/copy.service.js`** - The Brain
**Location**: Lines 26-68 (buildCopyPrompt function)

This is where the **magic happens**. The prompt is built here before being sent to OpenAI.

**What it does**:
- Takes user inputs (product, audience, tone)
- Looks up the selected niche + framework from taxonomy
- Retrieves niche-specific keywords from database
- Builds the final prompt string

**Current Prompt Template** (Line 47-57):
```javascript
const prompt = [
    '🦈 You are CopyShark - an elite, ruthless copywriter who writes copy that SELLS.',
    'Your mission: craft irresistible marketing copy that tugs at wallets and drives immediate action.',
    '',
    '⚡ YOUR COPYWRITING RULES:',
    '1. Lead with PAIN or DESIRE - hit emotional triggers hard',
    '2. Create URGENCY - make them feel they\'ll miss out if they don\'t act NOW',
    '3. Use POWER WORDS - transform, dominate, breakthrough, explosive, guaranteed, proven',
    '4. Be SPECIFIC - use numbers, percentages, concrete results (not vague promises)',
    '5. Write like you\'re having a 1-on-1 conversation - direct, personal, compelling',
    '6. Every sentence must EARN its place - cut fluff, maximize impact',
    '7. The CTA must be IRRESISTIBLE - make saying "no" feel like a mistake',
    '',
    '🎯 YOUR ASSIGNMENT:',
    `Product: "${safeProduct}"`,
    `Target Audience: "${safeAudience}"`,
    `Industry Context: "${resolvedNicheName}"`,
    `Persuasion Framework: "${resolvedFrameworkName}"`,
    `Tone: "${safeTone}"`,
    keywordInstruction,
    '',
    '💰 WHAT MAKES GREAT COPY:',
    '- Headlines that stop the scroll and demand attention',
    '- Body copy that builds desire and eliminates objections',
    '- CTAs that feel like the only logical next step',
    '- Language that speaks to aspirations AND fears',
    '- Specificity that builds credibility (numbers, proof, results)',
    '',
    '📝 OUTPUT FORMAT:',
    'Return ONLY a raw JSON object with these keys:',
    '{"headline": "60 chars max, punchy, benefit-driven", "body": "2-4 sentences, build desire and urgency", "cta": "Action-oriented, 3-5 words"}',
    '',
    '🔥 Now write copy that CONVERTS. Make every word count. Sell, sell, SELL!'
].filter(Boolean).join('\n');
```

**Example Prompt Sent to OpenAI**:
```
🦈 You are CopyShark - an elite, ruthless copywriter who writes copy that SELLS.
Your mission: craft irresistible marketing copy that tugs at wallets and drives immediate action.

⚡ YOUR COPYWRITING RULES:
1. Lead with PAIN or DESIRE - hit emotional triggers hard
2. Create URGENCY - make them feel they'll miss out if they don't act
  ecommerce: {
    name: 'eCommerce',
    description: 'Online retail and direct-to-consumer offers.'
  },
  saas: {
    name: 'SaaS',
    description: 'Software-as-a-Service tools and platforms.'
  },
  'llm-tuning': {
    name: 'LLM Fine-tuning and Training',
    description: 'Creating specialized AI models.'
  },
  general: {
    name: 'General',
    description: 'Default niche when no specialization is provided.'
  }
}
```

**Purpose**: Tells the AI what industry context to use. An eCommerce copy will be different from SaaS copy.

#### 2. **Frameworks** (Persuasion Structures)
**File**: `/services/frameworks.js`

Current frameworks:
```javascript
{
  aida: {
    name: 'AIDA',
    description: 'Attention, Interest, Desire, Action'
  },
  pas: {
    name: 'PAS',
    description: 'Problem-Agitate-Solution'
  }
}
```

**Purpose**: Defines the copywriting formula to follow.

**AIDA Framework**:
1. **A**ttention - Grab attention with a hook
2. **I**nterest - Build interest in the product
3. **D**esire - Create desire for the solution
4. **A**ction - Clear call-to-action

**PAS Framework**:
1. **P**roblem - Identify the pain point
2. **A**gitate - Make the problem feel urgent
3. **S**olution - Present your product as the fix

#### 3. **Keywords** (Niche-Specific Vocabulary)
**Database**: `niche_keywords` table

Example for `llm-tuning` niche:
```sql
niche_id     | keyword
-------------|-------------------
llm-tuning   | LoRA
llm-tuning   | hyperparameters
llm-tuning   | inference
llm-tuning   | quantization
llm-tuning   | overfitting
llm-tuning   | training data
llm-tuning   | foundation model
llm-tuning   | instruction tuning
```

**Purpose**: Provides industry jargon and technical terms that make the copy sound authentic and knowledgeable.

---

## 🔄 How Taxonomy Flows Through the System

### Step-by-Step Process

1. **User Selects Options** (Frontend)
   ```javascript
   // User picks from dropdowns
   niche: "llm-tuning"
   framework: "aida"
   product: "GPU Training Platform"
   audience: "ML Engineers"
   tone: "professional"
   ```

2. **Taxonomy Service Resolves** (`taxonomy.service.js`)
   ```javascript
   // Looks up metadata
   nicheMeta = {
     id: "llm-tuning",
     name: "LLM Fine-tuning and Training",
     description: "Creating specialized AI models."
   }
   
   frameworkMeta = {
     id: "aida",
     name: "AIDA",
     description: "Attention, Interest, Desire, Action"
   }
   
   // Fetches keywords from database
   keywords = ["LoRA", "hyperparameters", "inference", ...]
   ```

3. **Prompt Builder Assembles** (`copy.service.js`)
   ```javascript
   // Combines everything into a prompt
   prompt = "You are an expert copywriter... Product: 'GPU Training Platform'... 
             Niche: 'LLM Fine-tuning and Training'... Framework: 'AIDA'... 
             Use these keywords: LoRA, hyperparameters..."
   ```

4. **LLM Service Sends** (`llmService.js`)
   ```javascript
   // Sends to OpenAI with proper formatting
   await openai.chat.completions.create({
     model: "gpt-4o-mini",
     messages: [
       { role: "system", content: "You are an expert copywriter..." },
       { role: "user", content: prompt }
     ]
   })
   ```

5. **OpenAI Generates** (External API)
   ```json
   {
     "headline": "Train Custom AI Models 10x Faster with Production-Grade GPUs",
     "body": "Fine-tune foundation models with our optimized infrastructure. Support for LoRA, quantization, and enterprise-scale training data. Stop overfitting—start shipping AI that performs.",
     "cta": "Start Your Free Trial Today"
   }
   ```

---

## 🎯 Why This Architecture?

### Benefits

1. **Flexibility**: Change prompt structure without touching AI logic
2. **Context-Aware**: AI gets industry-specific guidance
3. **Consistency**: Same framework = similar output structure
4. **Scalability**: Easy to add new niches/frameworks
5. **Quality**: Keywords ensure authentic industry language

### Example: Same Product, Different Outputs

**Input**: "Email Marketing Tool"

**With eCommerce Niche + AIDA**:
```
Headline: "Convert More Abandoned Carts with Smart Email Sequences"
Body: "Recover lost sales automatically. Our AI-powered platform sends perfectly-timed emails..."
CTA: "Boost Your Revenue Today"
```

**With SaaS Niche + PAS**:
```
Headline: "Still Losing Leads Because Your Email Campaigns Don't Scale?"
Body: "Manual email management is killing your growth. While you're crafting one-off messages, competitors are automating..."
CTA: "See How We Can Help"
```

---

## 🔧 How to Modify the Prompt

### To Change the Prompt Template:

**Edit**: `/src/services/copy.service.js` lines 47-57

**Current**:
```javascript
const prompt = [
    'You are an expert copywriter. Generate persuasive marketing copy as structured JSON.',
    `Product: "${safeProduct}"`,
    `Audience: "${safeAudience}"`,
    `Niche: "${resolvedNicheName}"`,
    `Framework: "${resolvedFrameworkName}"`,
    `Tone: "${safeTone}"`,
    keywordInstruction,
    'Output ONLY a raw JSON object with the keys "headline", "body", "cta".'
].filter(Boolean).join(' ');
```

**Example Modification** (add brand voice):
```javascript
const brandVoiceInstruction = brandVoice 
    ? `Brand Voice: ${brandVoice}.` 
    : '';

const prompt = [
    'You are an expert copywriter. Generate persuasive marketing copy as structured JSON.',
    `Product: "${safeProduct}"`,
    `Audience: "${safeAudience}"`,
    `Niche: "${resolvedNicheName}"`,
    `Framework: "${resolvedFrameworkName}"`,
    `Tone: "${safeTone}"`,
    brandVoiceInstruction,  // NEW
    keywordInstruction,
    'Output ONLY a raw JSON object with the keys "headline", "body", "cta".',
    'Make the headline under 60 characters.'  // NEW CONSTRAINT
].filter(Boolean).join(' ');
```

### To Add a New Niche:

**Option 1**: Add to `/services/niches.js`
```javascript
module.exports = {
    // ...existing niches...
    'fintech': { 
        name: 'Financial Technology', 
        description: 'Banking, payments, and financial services.'
    }
};
```

**Option 2**: Add to database
```sql
INSERT INTO niches (id, name, description) 
VALUES ('fintech', 'Financial Technology', 'Banking, payments, and financial services.');

-- Add keywords
INSERT INTO niche_keywords (niche_id, keyword) VALUES
('fintech', 'blockchain'),
('fintech', 'KYC'),
('fintech', 'compliance'),
('fintech', 'APR');
```

### To Add a New Framework:

**Edit**: `/services/frameworks.js`
```javascript
module.exports = {
    aida: { name: 'AIDA', description: 'Attention, Interest, Desire, Action' },
    pas: { name: 'PAS', description: 'Problem-Agitate-Solution' },
    fab: { name: 'FAB', description: 'Features, Advantages, Benefits' }  // NEW
};
```

---

## 📊 System Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         USER INPUT                          │
│  Product, Audience, Niche, Framework, Tone                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              TAXONOMY SERVICE                               │
│  • Resolve niche metadata                                   │
│  • Resolve framework metadata                               │
│  • Fetch keywords from database                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              PROMPT BUILDER                                 │
│  buildCopyPrompt() in copy.service.js                       │
│  • Combines all inputs                                      │
│  • Adds system instructions                                 │
│  • Formats as single prompt string                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              LLM SERVICE                                    │
│  • Formats for OpenAI API                                   │
│  • Handles retries/errors                                   │
│  • Parses JSON response                                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              OPENAI API (gpt-4o-mini)                       │
│  • Processes prompt                                         │
│  • Generates copy                                           │
│  • Returns JSON: {headline, body, cta}                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              VARIANT SAVED TO DATABASE                      │
│  Stored with: brandId, projectId, generated copy fields    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎓 Key Takeaways

1. **Prompt is built dynamically** in `copy.service.js` based on user inputs
2. **Taxonomy provides context** - niche defines industry, framework defines structure
3. **Keywords add authenticity** - database-stored terms make copy sound professional
4. **Easy to extend** - add niches/frameworks without touching core logic
5. **OpenAI receives structured prompt** - clear instructions = better output

---

## 📝 Quick Reference

| Component | File | Purpose |
|-----------|------|---------|
| Prompt Builder | `src/services/copy.service.js` | Assembles the prompt |
| Taxonomy Logic | `src/services/taxonomy.service.js` | Resolves niches/frameworks |
| Niche Definitions | `services/niches.js` | Industry categories |
| Framework Definitions | `services/frameworks.js` | Copywriting formulas |
| Keywords | `niche_keywords` table | Industry-specific terms |
| LLM Integration | `services/llmService.js` | Talks to OpenAI |

---

**Want to improve copy quality?** Focus on:
1. Better niche descriptions
2. More comprehensive keywords per niche
3. More detailed framework instructions in the prompt
4. Brand voice integration (from brand profile data)
