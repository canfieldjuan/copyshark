# 🦈 CopyShark Prompt Upgrade

## The Transformation

### BEFORE: Generic Copywriter
```
You are an expert copywriter. Generate persuasive marketing copy as structured JSON.
Product: "X"
Audience: "Y"
Niche: "Z"
Framework: "AIDA"
Tone: "professional"
Output ONLY a raw JSON object with the keys "headline", "body", "cta".
```

**Problems:**
- ❌ Too generic and bland
- ❌ No emotional hooks
- ❌ No urgency or persuasion tactics
- ❌ Doesn't emphasize conversion
- ❌ Lacks personality

---

### AFTER: CopyShark 🦈
```
🦈 You are CopyShark - an elite, ruthless copywriter who writes copy that SELLS.
Your mission: craft irresistible marketing copy that tugs at wallets and drives immediate action.

⚡ YOUR COPYWRITING RULES:
1. Lead with PAIN or DESIRE - hit emotional triggers hard
2. Create URGENCY - make them feel they'll miss out if they don't act NOW
3. Use POWER WORDS - transform, dominate, breakthrough, explosive, guaranteed, proven
4. Be SPECIFIC - use numbers, percentages, concrete results (not vague promises)
5. Write like you're having a 1-on-1 conversation - direct, personal, compelling
6. Every sentence must EARN its place - cut fluff, maximize impact
7. The CTA must be IRRESISTIBLE - make saying "no" feel like a mistake

🎯 YOUR ASSIGNMENT:
Product: "X"
Target Audience: "Y"
Industry Context: "Z"
Persuasion Framework: "AIDA"
Tone: "professional"

💰 WHAT MAKES GREAT COPY:
- Headlines that stop the scroll and demand attention
- Body copy that builds desire and eliminates objections
- CTAs that feel like the only logical next step
- Language that speaks to aspirations AND fears
- Specificity that builds credibility (numbers, proof, results)

📝 OUTPUT FORMAT:
Return ONLY a raw JSON object with these keys:
{"headline": "60 chars max, punchy, benefit-driven", "body": "2-4 sentences, build desire and urgency", "cta": "Action-oriented, 3-5 words"}

🔥 Now write copy that CONVERTS. Make every word count. Sell, sell, SELL!
```

**Improvements:**
- ✅ Aggressive, conversion-focused persona
- ✅ 7 specific copywriting rules
- ✅ Emotional triggers (pain, desire, fear, aspiration)
- ✅ Urgency and FOMO tactics
- ✅ Power words and specificity requirements
- ✅ Clear quality standards for each element
- ✅ Memorable personality ("CopyShark")

---

## Expected Output Differences

### Example: Email Marketing Tool for Small Businesses

#### BEFORE (Generic Prompt)
```json
{
  "headline": "Email Marketing Made Easy",
  "body": "Our platform helps you create and send professional email campaigns. Reach your customers with beautiful templates and easy-to-use tools.",
  "cta": "Get Started"
}
```
**Issues:** Boring, generic, no urgency, weak CTA

---

#### AFTER (CopyShark Prompt)
```json
{
  "headline": "Stop Losing Sales to Your Inbox (Fix It in 5 Minutes)",
  "body": "While you're manually sending emails, competitors are automating 10x more touchpoints. Our platform turns every subscriber into a revenue stream—proven to boost conversions by 47% in 30 days. No tech skills needed.",
  "cta": "Start Free Trial Now"
}
```
**Improvements:**
- ✅ Pain-focused headline (losing sales)
- ✅ Urgency (5 minutes, competitors winning)
- ✅ Specific numbers (10x, 47%, 30 days)
- ✅ Benefit-driven (revenue stream, boost conversions)
- ✅ Objection handling (no tech skills)
- ✅ Action-oriented CTA (Start Free Trial NOW)

---

## The 7 CopyShark Rules Explained

### 1. Lead with PAIN or DESIRE
**Bad:** "Email marketing software"  
**Good:** "Stop losing customers to abandoned carts"

### 2. Create URGENCY
**Bad:** "Sign up anytime"  
**Good:** "Limited spots - 47 businesses joined today"

### 3. Use POWER WORDS
**Bad:** "Improve your results"  
**Good:** "Transform your revenue, dominate your market"

### 4. Be SPECIFIC
**Bad:** "Increase conversions"  
**Good:** "Boost conversions by 47% in 30 days"

### 5. Conversational Tone
**Bad:** "Our solution provides comprehensive functionality"  
**Good:** "You're losing money every day you wait. Here's why..."

### 6. Every Sentence Earns Its Place
**Bad:** "We are a leading provider of innovative solutions that help businesses succeed"  
**Good:** "Turn subscribers into buyers. Automatically."

### 7. Irresistible CTAs
**Bad:** "Learn More"  
**Good:** "Claim Your Free Trial" / "Start Winning Today"

---

## Technical Implementation

**File:** `/src/services/copy.service.js`  
**Function:** `buildCopyPrompt()`  
**Lines:** 47-79

**Changes:**
- Expanded from 8 lines to 33 lines
- Changed from space-separated to newline-separated (better readability)
- Added emojis for visual structure (🦈⚡💰🔥)
- Structured into clear sections (RULES, ASSIGNMENT, QUALITY, FORMAT)

**Server Restart Required:** Yes (Node.js loads code at startup)

---

## Testing the New Prompt

### How to Verify
1. Go to http://localhost:4000/app.html
2. Create a new campaign
3. Generate copy variants
4. Compare output to previous versions

### What to Look For
- ✅ Headlines with emotional hooks
- ✅ Body copy with specific numbers/results
- ✅ Urgency language ("now", "today", "limited")
- ✅ Power words ("transform", "dominate", "breakthrough")
- ✅ CTAs that feel compelling

### Red Flags (If These Appear, Prompt Needs Tuning)
- ❌ Generic headlines like "Introducing X"
- ❌ Vague claims without numbers
- ❌ Passive CTAs like "Learn More"
- ❌ Corporate jargon instead of conversational tone

---

## Future Enhancements

### Potential Additions
1. **A/B Testing Variants:** Generate 2 versions (aggressive vs subtle)
2. **Industry-Specific Rules:** Different tactics for B2B vs B2C
3. **Tone Modulation:** Adjust aggression based on tone parameter
4. **Competitor Analysis:** Include competitor positioning in prompt
5. **Brand Voice Integration:** Pull brand voice from brand_profiles table

### Framework-Specific Prompts
Instead of one universal prompt, create specialized versions:
- **AIDA Prompt:** Focus on attention-grabbing and desire-building
- **PAS Prompt:** Emphasize problem agitation and solution clarity
- **FAB Prompt:** Lead with features, transition to benefits

---

## Rollback Instructions

If the new prompt produces poor results:

1. **Edit:** `/src/services/copy.service.js` lines 47-79
2. **Replace with:**
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
3. **Restart server:** `pkill -f "node server.js" && npm start`

---

## Success Metrics

Track these to measure prompt effectiveness:

1. **User Feedback Ratings:** Average stars on generated variants
2. **Edit Frequency:** How often users edit generated copy
3. **Variant Acceptance:** % of variants used without modification
4. **Conversion Reports:** If users report better performance

**Baseline:** Establish metrics before/after prompt change

---

## Summary

**What Changed:** Transformed generic copywriter into aggressive, conversion-focused CopyShark

**Why:** To generate copy that sells, not just informs

**Impact:** More emotional, urgent, specific, and action-oriented copy

**Status:** ✅ Live on server (OpenAI gpt-4o-mini)

**Next Steps:** Test generation, gather feedback, iterate on prompt
