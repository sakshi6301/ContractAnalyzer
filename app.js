// ═══════════════════════════════════════════════════════════
//  CONTRACT RISK ANALYZER — Core Application
//  Client-side contract analysis engine + UI controller
// ═══════════════════════════════════════════════════════════

// ────────────────────────────────────────
//  RISK PATTERN DATABASE
// ────────────────────────────────────────

const RISK_PATTERNS = {
  payment: {
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 18px; height: 18px;"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>',
    label: 'Payment Terms',
    patterns: [
      {
        regex: /payment\s+(?:shall|will)\s+be\s+made\s+(?:in\s+full\s+)?within\s+(\d+)\s+days/i,
        check: (match) => {
          const days = parseInt(match[1]);
          if (days > 60) return { severity: 'critical', score: 95 };
          if (days > 45) return { severity: 'high', score: 75 };
          if (days > 30) return { severity: 'medium', score: 50 };
          return null;
        },
        title: 'Extended Payment Timeline',
        explain: (match) => {
          const days = match[1];
          return `You won't get paid for ${days} days after delivering your work. Industry standard for freelancers is 14-30 days. Waiting ${days} days means you're essentially financing the client's project.`;
        },
        suggestion: `Payment shall be made within 14 days of invoice date. A deposit of 50% is due before work commences, with the remaining balance due upon delivery of final deliverables.`
      },
      {
        regex: /no\s+(?:partial|milestone)\s+payments/i,
        check: () => ({ severity: 'high', score: 80 }),
        title: 'No Milestone Payments',
        explain: () => `The contract requires you to complete ALL work before receiving any payment. This puts 100% of the financial risk on you. If the client disappears or refuses to pay, you've worked for free.`,
        suggestion: `The project fee shall be paid in installments: 50% upon signing, 25% at the project midpoint, and 25% upon delivery of final deliverables.`
      },
      {
        regex: /(?:client|company)\s+may\s+withhold\s+payment/i,
        check: () => ({ severity: 'critical', score: 90 }),
        title: 'Subjective Payment Withholding',
        explain: () => `The client can refuse to pay based on their own subjective judgment. There's no objective standard for what "meets expectations" means, giving the client an easy excuse to withhold payment.`,
        suggestion: `Payment may only be withheld if the deliverables materially fail to conform to the agreed specifications in Exhibit A. The Client must provide written notice of specific deficiencies and allow the Contractor 10 business days to remedy them.`
      },
      {
        regex: /late\s+(?:payment\s+)?fees?\s+shall\s+not\s+apply/i,
        check: () => ({ severity: 'high', score: 70 }),
        title: 'No Late Payment Penalties',
        explain: () => `Without late fees, the client has no financial incentive to pay you on time. This is like giving an interest-free loan. Most professional contracts include 1-2% monthly late fees.`,
        suggestion: `Late payments shall incur a fee of 1.5% per month on the outstanding balance. The Contractor reserves the right to suspend work if payment is overdue by more than 14 days.`
      },
      {
        regex: /no\s+compensation\s+(?:shall\s+be\s+)?owed\s+for\s+work\s+completed/i,
        check: () => ({ severity: 'critical', score: 95 }),
        title: 'No Payment for Completed Work',
        explain: () => `If the contract is terminated, you get NOTHING for work you've already done. This means the client could use 90% of your work and pay $0.`,
        suggestion: `Upon termination, the Client shall pay for all work completed up to the termination date, calculated on a pro-rata basis of the total project fee.`
      }
    ]
  },

  intellectualProperty: {
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 18px; height: 18px;"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1.34.52 2.5 1.5 3.5.76.76 1.23 1.52 1.41 2.5"/></svg>',
    label: 'Intellectual Property',
    patterns: [
      {
        regex: /work\s+made\s+for\s+hire/i,
        nlpQuery: '(work|deliverables) [is|are] (produced|made) for hire',
        check: () => ({ severity: 'medium', score: 45 }),
        title: 'Work-for-Hire Classification',
        explain: () => `"Work made for hire" means you have ZERO ownership of what you create — the client is legally considered the author. This is common but can be risky if it also prevents portfolio use.`,
        suggestion: `The final approved deliverables shall be assigned to the Client upon receipt of full payment. The Contractor retains the right to use the work in their portfolio and for self-promotion.`
      },
      {
        regex: /(?:not|shall\s+not)\s+(?:to\s+)?use\s+any\s+portion.*portfolio/i,
        check: () => ({ severity: 'high', score: 80 }),
        title: 'No Portfolio Usage Rights',
        explain: () => `You can't show this work in your portfolio or use it to attract future clients. Your portfolio IS your resume as a freelancer — blocking it directly impacts your ability to find new work.`,
        suggestion: `The Contractor retains the right to display the work in their portfolio, website, case studies, and social media for self-promotion purposes, provided no confidential business data is disclosed.`
      },
      {
        regex: /(?:tools|frameworks|libraries|pre-existing\s+code).*(?:become|shall\s+be|property\s+of\s+the\s+client)/i,
        check: () => ({ severity: 'critical', score: 90 }),
        title: 'Client Claims Your Pre-existing Tools',
        explain: () => `The client is claiming ownership of tools and code you created BEFORE this project. This means they could prevent you from using your own frameworks and libraries on future projects.`,
        suggestion: `Pre-existing tools, templates, libraries, frameworks, and code developed by the Contractor prior to or independently of this agreement remain the sole property of the Contractor. The Client receives a non-exclusive license to use such materials as part of the deliverables.`
      },
      {
        regex: /waives?\s+all\s+moral\s+rights/i,
        check: () => ({ severity: 'medium', score: 55 }),
        title: 'Moral Rights Waiver',
        explain: () => `You're waiving your "moral rights" — your right to be credited as the creator and to prevent modifications that could damage your reputation. Common in commercial work but worth being aware of.`,
        suggestion: `The Contractor waives moral rights to the extent permitted by law, provided the Client does not use the work in a manner that is defamatory or harmful to the Contractor's professional reputation.`
      },
      {
        regex: /inventions.*(?:developed|created).*(?:client's\s+(?:resources|time)).*(?:property\s+of\s+the\s+client|sole\s+property)/i,
        check: () => ({ severity: 'high', score: 75 }),
        title: 'Invention Assignment Overreach',
        explain: () => `Any methods or processes you develop during this engagement become the client's property, even if they're general techniques you'd use on other projects. This is overly broad for a freelance arrangement.`,
        suggestion: `Inventions and proprietary methods developed by the Contractor shall only become the Client's property if they are specifically created for and funded by the Client's project. General methodologies, skills, and knowledge gained remain the Contractor's property.`
      }
    ]
  },

  termination: {
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 18px; height: 18px;"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
    label: 'Termination',
    patterns: [
      {
        regex: /(?:client|company)\s+may\s+terminate.*(?:at\s+any\s+time|for\s+any\s+reason).*(?:no\s+(?:prior\s+)?notice)/i,
        check: () => ({ severity: 'critical', score: 90 }),
        title: 'Client Can Terminate Without Notice',
        explain: () => `The client can fire you instantly with zero warning. You could be mid-project, have turned down other work, and suddenly have no income. Professional contracts require at least 14-30 days notice.`,
        suggestion: `Either party may terminate this agreement with 14 days written notice. Upon early termination by the Client, the Contractor shall be paid for all work completed plus a kill fee of 25% of the remaining project value.`
      },
      {
        regex: /(?:contractor|freelancer)\s+(?:may\s+not|shall\s+not|cannot)\s+terminate/i,
        check: () => ({ severity: 'high', score: 75 }),
        title: 'Contractor Cannot Terminate',
        explain: () => `You're locked in — the client can leave anytime but you can't. This one-sided arrangement means even if the client becomes abusive, fails to communicate, or changes scope dramatically, you're stuck.`,
        suggestion: `Either party may terminate this agreement with 14 days written notice. The Contractor may terminate immediately if the Client fails to make payment within 14 days of the due date.`
      },
      {
        regex: /(?:no|without\s+any)\s+(?:kill\s+fee|termination\s+(?:fee|penalty|payment))/i,
        check: () => ({ severity: 'medium', score: 55 }),
        title: 'No Kill Fee',
        explain: () => `If the project is canceled, there's no kill fee to compensate you for turning down other work and reserving your time. Kill fees (typically 25-50% of remaining value) are standard in freelancing.`,
        suggestion: `Upon termination by the Client for convenience, a kill fee equal to 25% of the remaining unpaid project balance shall be payable to the Contractor, in addition to payment for all completed work.`
      }
    ]
  },

  liability: {
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 18px; height: 18px;"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>',
    label: 'Liability & Indemnity',
    patterns: [
      {
        regex: /(?:contractor|freelancer)(?:'s)?\s+(?:total\s+)?liability.*(?:shall\s+be\s+)?unlimited/i,
        nlpQuery: '(liability|damages) shall be unlimited',
        check: () => ({ severity: 'critical', score: 95 }),
        title: 'Unlimited Personal Liability',
        explain: () => `Your personal liability is UNLIMITED. A $5,000 project could result in a $500,000 lawsuit against you personally. This could bankrupt you. Always cap liability to the contract value.`,
        suggestion: `The Contractor's total aggregate liability under this agreement shall not exceed the total fees actually paid by the Client under this agreement. Neither party shall be liable for indirect, incidental, special, or consequential damages.`
      },
      {
        regex: /(?:contractor|freelancer)\s+shall\s+indemnify.*(?:defend|hold\s+harmless)/i,
        check: () => ({ severity: 'high', score: 70 }),
        title: 'One-Sided Indemnification',
        explain: () => `You're agreeing to pay for the client's legal defense if any claims arise from your work. This should be mutual — both parties should indemnify each other, and it should be limited to negligence or misconduct.`,
        suggestion: `Each party shall indemnify the other against claims arising from their own negligence or willful misconduct. The indemnifying party's obligations are limited to the total fees paid under this agreement.`
      },
      {
        regex: /regardless\s+of\s+fault/i,
        check: () => ({ severity: 'critical', score: 90 }),
        title: 'Liability Regardless of Fault',
        explain: () => `You're liable even when it's NOT your fault. If the client misuses your work, gives bad requirements, or a third party causes the issue, you're still on the hook. This is extremely one-sided.`,
        suggestion: `The Contractor shall be liable only for claims directly resulting from the Contractor's negligence, errors, or willful misconduct. The Contractor is not liable for damages arising from the Client's misuse of deliverables or failure to provide accurate requirements.`
      },
      {
        regex: /(?:client|company)\s+shall\s+not\s+be\s+liable/i,
        check: () => ({ severity: 'high', score: 65 }),
        title: 'Client Disclaims All Liability',
        explain: () => `The client has zero liability to you under any circumstances. If they cause you damages through their actions, bad requirements, or negligence, you have no recourse.`,
        suggestion: `Neither party shall be liable for indirect or consequential damages. Each party's liability is limited to the total fees paid under this agreement in the 12 months preceding the claim.`
      }
    ]
  },

  nonCompete: {
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 18px; height: 18px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    label: 'Non-Compete',
    patterns: [
      {
        regex: /(?:non-?compete|not\s+(?:to\s+)?engage|not\s+(?:to\s+)?(?:provide|perform)).*?(\d+)\s+years?/i,
        check: (match) => {
          const years = parseInt(match[1]);
          if (years >= 3) return { severity: 'critical', score: 95 };
          if (years >= 2) return { severity: 'high', score: 80 };
          if (years >= 1) return { severity: 'medium', score: 55 };
          return { severity: 'low', score: 30 };
        },
        title: 'Non-Compete Duration',
        explain: (match) => {
          const years = match[1];
          return `You can't work in a competing field for ${years} year(s) after the contract ends. For a freelancer, this could mean ${years} year(s) of lost income in your primary field. Courts often reject overly long non-competes, but fighting it costs money.`;
        },
        suggestion: `During the term of this agreement and for a period of 6 months following its termination, the Contractor agrees not to provide substantially similar services to the Client's direct competitors listed in Exhibit B. This restriction is limited to the same geographic market.`
      },
      {
        regex: /(?:applies?\s+)?worldwide/i,
        check: () => ({ severity: 'high', score: 80 }),
        title: 'Worldwide Non-Compete Scope',
        explain: () => `The non-compete applies GLOBALLY. You can't work in your field anywhere in the world. This is almost certainly unenforceable in court, but challenging it is expensive and stressful.`,
        suggestion: `This restriction applies only within the metropolitan area where the Client's primary place of business is located.`
      },
      {
        regex: /(?:plans?\s+to\s+operate|all\s+industries)/i,
        check: () => ({ severity: 'critical', score: 85 }),
        title: 'Vague Industry Scope',
        explain: () => `The non-compete covers industries the client "plans to operate" in — which could be anything. This gives the client unlimited power to block your future work in virtually any field.`,
        suggestion: `This restriction is limited to the specific industry and services described in Section 1 (Scope of Work) of this agreement.`
      },
      {
        regex: /(?:not\s+(?:to\s+)?)?solicit.*(?:clients?|customers?|vendors?|partners?).*?(\d+)\s+years?/i,
        check: (match) => {
          const years = parseInt(match[1]);
          if (years >= 2) return { severity: 'high', score: 70 };
          return { severity: 'medium', score: 45 };
        },
        title: 'Non-Solicitation Clause',
        explain: (match) => {
          const years = match[1];
          return `You can't contact or work for any of the client's clients, vendors, or partners for ${years} year(s). This severely limits your networking and future client acquisition.`;
        },
        suggestion: `The Contractor agrees not to directly solicit the Client's current customers for competing services for 12 months. This does not prevent the Contractor from accepting inbound inquiries or responding to general marketing.`
      }
    ]
  },

  confidentiality: {
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 18px; height: 18px;"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/><line x1="3" y1="3" x2="21" y2="21"/></svg>',
    label: 'Confidentiality',
    patterns: [
      {
        regex: /(?:obligation|confidentiality).*(?:survive|last|continue).*indefinitely/i,
        check: () => ({ severity: 'high', score: 70 }),
        title: 'Perpetual Confidentiality',
        explain: () => `Your confidentiality obligation lasts FOREVER. Industry standard is 2-5 years. A perpetual NDA means you can never discuss any aspect of this project, even if the information becomes public knowledge.`,
        suggestion: `Confidentiality obligations shall survive for 3 years after termination of this agreement. Information that becomes publicly available through no fault of the Contractor is excluded.`
      },
      {
        regex: /(?:shall\s+not|must\s+not|may\s+not)\s+disclose\s+any\s+aspect\s+of\s+this\s+agreement/i,
        check: () => ({ severity: 'medium', score: 55 }),
        title: 'Cannot Disclose Agreement Exists',
        explain: () => `You can't even tell people this agreement exists. This prevents you from listing the client in your "clients I've worked with" section and limits professional networking.`,
        suggestion: `The Contractor may disclose the existence of this working relationship and the general nature of services provided, but shall not disclose specific financial terms or proprietary project details.`
      },
      {
        regex: /(?:client|company)\s+deems?\s+confidential/i,
        check: () => ({ severity: 'medium', score: 50 }),
        title: 'Client Defines What\'s Confidential',
        explain: () => `The client can retroactively declare anything "confidential." This vague definition gives them unlimited power to restrict what you can discuss or use from this engagement.`,
        suggestion: `Confidential information means information clearly marked as "Confidential" or that a reasonable person would understand to be confidential. Confidential information does not include: (a) publicly available information, (b) information known prior to disclosure, or (c) information independently developed.`
      }
    ]
  },

  scope: {
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 18px; height: 18px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
    label: 'Scope & Revisions',
    patterns: [
      {
        regex: /unlimited\s+revisions/i,
        check: () => ({ severity: 'critical', score: 90 }),
        title: 'Unlimited Revisions',
        explain: () => `You're agreeing to make unlimited changes until the client is satisfied. This is a recipe for scope creep — the project could take 10x longer than planned with no additional compensation.`,
        suggestion: `The project includes 2 rounds of revisions per deliverable. Each revision round allows the Client to provide consolidated feedback. Additional revision rounds will be billed at the Contractor's hourly rate of $[X] per hour.`
      },
      {
        regex: /(?:modify|change)\s+(?:the\s+)?(?:project\s+)?scope\s+at\s+any\s+time.*(?:without\s+additional\s+cost|no\s+additional)/i,
        check: () => ({ severity: 'critical', score: 95 }),
        title: 'Free Scope Changes',
        explain: () => `The client can change the project requirements anytime and you have to do the extra work for FREE. This is the #1 cause of freelancer burnout and financial loss.`,
        suggestion: `Any changes to the scope of work must be documented in a written Change Order signed by both parties, including an updated timeline and additional compensation if applicable.`
      },
      {
        regex: /described\s+verbally|future\s+communications/i,
        check: () => ({ severity: 'high', score: 75 }),
        title: 'Verbal/Undefined Requirements',
        explain: () => `The scope includes work described "verbally" or in "future communications." This means the client can claim you agreed to features you never discussed. Always require written scope documentation.`,
        suggestion: `The scope of work is limited to the deliverables explicitly listed in Exhibit A. Any additional requests must be submitted in writing and agreed upon by both parties before work begins.`
      }
    ]
  },

  dispute: {
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 18px; height: 18px;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    label: 'Dispute Resolution',
    patterns: [
      {
        regex: /(?:arbitration|jurisdiction)\s+.*(?:selected|chosen|determined)\s+by\s+the\s+(?:client|company)/i,
        check: () => ({ severity: 'high', score: 65 }),
        title: 'Client Chooses Dispute Venue',
        explain: () => `If there's a dispute, you have to travel to wherever the client wants. This could be across the country, making it financially impractical for you to pursue your case.`,
        suggestion: `Disputes shall be resolved through binding arbitration in the metropolitan area where the Contractor is located, or via online arbitration if the parties are in different states.`
      },
      {
        regex: /(?:all\s+)?(?:arbitration\s+)?costs?\s+shall\s+be\s+borne\s+by\s+the\s+(?:contractor|freelancer)/i,
        check: () => ({ severity: 'high', score: 70 }),
        title: 'Contractor Bears All Legal Costs',
        explain: () => `You pay for ALL arbitration costs, even if you win. This makes it financially impossible for most freelancers to pursue legitimate claims. Costs should be shared equally or borne by the losing party.`,
        suggestion: `Arbitration costs shall be shared equally between the parties. The prevailing party shall be entitled to recover reasonable attorney's fees and costs from the other party.`
      },
      {
        regex: /waives?\s+(?:the\s+)?right\s+to\s+(?:a\s+)?(?:trial|jury)/i,
        check: () => ({ severity: 'medium', score: 45 }),
        title: 'Jury Trial Waiver',
        explain: () => `You're waiving your right to a jury trial. While this is common in commercial contracts, it means disputes are decided by an arbitrator (often favoring repeat corporate clients) rather than a jury of peers.`,
        suggestion: `Both parties agree to resolve disputes through mediation first, followed by binding arbitration if mediation is unsuccessful. Each party retains the right to seek injunctive relief in court if necessary.`
      }
    ]
  }
};

// ────────────────────────────────────────
//  CONTRACT ANALYZER ENGINE
// ────────────────────────────────────────

class ContractAnalyzer {
  constructor(text) {
    this.rawText = text;
    this.clauses = [];
    this.findings = [];
    this.overallScore = 0;
    this.categoryScores = {};
  }

  analyze() {
    this.clauses = this._extractClauses();
    this.findings = this._detectRisks();
    this._computeScores();
    return this.getResults();
  }

  _extractClauses() {
    const text = this.rawText;
    // Split on numbered headings like "1.", "2.", "Section 1:", etc.
    const sectionPattern = /(?:^|\n)\s*(?:(?:SECTION|ARTICLE)\s+)?\d+[\.\)]\s*[A-Z][A-Z\s&,\/\-]+/gm;
    const matches = [...text.matchAll(sectionPattern)];
    
    if (matches.length < 2) {
      // Fallback: treat whole text as one clause
      return [{ title: 'Full Contract', text: text.trim(), index: 0 }];
    }

    const clauses = [];
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index;
      const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
      const sectionText = text.slice(start, end).trim();
      const titleMatch = sectionText.match(/^(?:(?:SECTION|ARTICLE)\s+)?\d+[\.\)]\s*(.+)/i);
      const title = titleMatch ? titleMatch[1].trim() : `Section ${i + 1}`;
      clauses.push({ title, text: sectionText, index: i });
    }
    return clauses;
  }

  _detectRisks() {
    const findings = [];
    const text = this.rawText;
    
    // Initialize NLP engine if compromise.js is loaded
    const nlpEngine = typeof window.nlp !== 'undefined' ? window.nlp(text) : null;

    for (const [categoryKey, category] of Object.entries(RISK_PATTERNS)) {
      for (const pattern of category.patterns) {
        let match = text.match(pattern.regex);
        let matchedText = '';

        // NLP Fallback if regex misses
        if (!match && nlpEngine && pattern.nlpQuery) {
          let nlpMatch = nlpEngine.match(pattern.nlpQuery);
          if (nlpMatch.found) {
            matchedText = nlpMatch.text();
            match = [matchedText];
            // Mock index for clause association
            match.index = text.indexOf(matchedText);
            // If the original check required capture groups (like days/years), provide a safe fallback
            if (pattern.regex.source.includes('\\d+')) {
              const numMatch = matchedText.match(/\d+/);
              if (numMatch) match[1] = numMatch[0];
            }
          }
        } else if (match) {
          matchedText = match[0];
        }

        if (match) {
          const result = pattern.check(match);
          if (result) {
            // Find which clause this match belongs to
            const matchIndex = match.index !== undefined ? match.index : text.indexOf(matchedText);
            let clauseIndex = 0;
            for (let i = 0; i < this.clauses.length; i++) {
              const clauseStart = this.rawText.indexOf(this.clauses[i].text);
              const clauseEnd = clauseStart + this.clauses[i].text.length;
              if (matchIndex >= clauseStart && matchIndex < clauseEnd) {
                clauseIndex = i;
                break;
              }
            }

            findings.push({
              category: categoryKey,
              categoryLabel: category.label,
              categoryIcon: category.icon,
              clauseIndex,
              clauseTitle: this.clauses[clauseIndex]?.title || 'Unknown Section',
              clauseText: this.clauses[clauseIndex]?.text || '',
              severity: result.severity,
              score: result.score,
              title: pattern.title,
              explanation: typeof pattern.explain === 'function' ? pattern.explain(match) : pattern.explain,
              suggestion: pattern.suggestion,
              matchedText: matchedText
            });
          }
        }
      }
    }

    // Sort by score descending (most risky first)
    findings.sort((a, b) => b.score - a.score);
    return findings;
  }

  _computeScores() {
    // Category scores
    const catGroups = {};
    for (const f of this.findings) {
      if (!catGroups[f.category]) catGroups[f.category] = [];
      catGroups[f.category].push(f.score);
    }

    for (const [cat, scores] of Object.entries(catGroups)) {
      // Weighted average: highest risk weighs more
      const sorted = scores.sort((a, b) => b - a);
      let weight = 1;
      let totalWeight = 0;
      let weighted = 0;
      for (const s of sorted) {
        weighted += s * weight;
        totalWeight += weight;
        weight *= 0.6;
      }
      this.categoryScores[cat] = Math.round(weighted / totalWeight);
    }

    // Overall score: weighted average of all category scores
    const catScoreValues = Object.values(this.categoryScores);
    if (catScoreValues.length === 0) {
      this.overallScore = 5; // Very safe if nothing found
    } else {
      const maxScore = Math.max(...catScoreValues);
      const avgScore = catScoreValues.reduce((a, b) => a + b, 0) / catScoreValues.length;
      // Weighted towards the max (worst category matters most)
      this.overallScore = Math.round(maxScore * 0.6 + avgScore * 0.4);
    }
  }

  getResults() {
    return {
      overallScore: this.overallScore,
      overallVerdict: this._getVerdict(this.overallScore),
      categoryScores: this.categoryScores,
      findings: this.findings,
      clauses: this.clauses,
      stats: {
        totalClauses: this.clauses.length,
        totalFindings: this.findings.length,
        critical: this.findings.filter(f => f.severity === 'critical').length,
        high: this.findings.filter(f => f.severity === 'high').length,
        medium: this.findings.filter(f => f.severity === 'medium').length,
        low: this.findings.filter(f => f.severity === 'low').length,
      }
    };
  }

  _getVerdict(score) {
    if (score >= 80) return { label: 'High Risk', level: 'critical', description: 'This contract has serious issues that could cost you money and restrict your career. Do NOT sign without major revisions.' };
    if (score >= 60) return { label: 'Elevated Risk', level: 'high', description: 'Several concerning clauses found. Negotiate these points before signing.' };
    if (score >= 35) return { label: 'Moderate Risk', level: 'medium', description: 'A few clauses need attention, but the contract is mostly reasonable.' };
    if (score >= 15) return { label: 'Low Risk', level: 'low', description: 'This contract is mostly fair with minor points to consider.' };
    return { label: 'Looking Good', level: 'low', description: 'This appears to be a well-balanced contract. Review the details, but no major red flags detected.' };
  }
}

// ────────────────────────────────────────
//  UI CONTROLLER
// ────────────────────────────────────────

class App {
  constructor() {
    this.results = null;
    this.activeFilter = 'all';
    this._bindElements();
    this._bindEvents();
    this._initScrollObserver();
  }

  _bindElements() {
    // Input elements
    this.tabBtns = document.querySelectorAll('.tab-btn');
    this.tabPanels = document.querySelectorAll('.tab-panel');
    this.textarea = document.getElementById('contractText');
    this.charCount = document.getElementById('charCount');
    this.dropZone = document.getElementById('dropZone');
    this.fileInput = document.getElementById('fileInput');
    this.sampleCards = document.querySelectorAll('.sample-card');
    
    // Buttons
    this.analyzeBtn = document.getElementById('analyzeBtn');
    this.clearBtn = document.getElementById('clearBtn');
    
    // Results
    this.resultsSection = document.getElementById('resultsSection');
    this.gaugeRing = document.getElementById('gaugeRing');
    this.gaugeScore = document.getElementById('gaugeScore');
    this.gaugeVerdict = document.getElementById('gaugeVerdict');
    this.gaugeSublabel = document.getElementById('gaugeSublabel');
    this.categoryGrid = document.getElementById('categoryGrid');
    this.riskSummaryBar = document.getElementById('riskSummaryBar');
    this.legendLow = document.getElementById('legendLow');
    this.legendMedium = document.getElementById('legendMedium');
    this.legendHigh = document.getElementById('legendHigh');
    this.legendCritical = document.getElementById('legendCritical');
    this.clauseCards = document.getElementById('clauseCards');
    this.filterPills = document.querySelectorAll('.filter-pill');

    // Overlay
    this.analyzingOverlay = document.getElementById('analyzingOverlay');
    
    // Scroll-to-top
    this.scrollTopBtn = document.getElementById('scrollTopBtn');
    
    // Phase 2 Elements
    this.navHistoryBtn = document.getElementById('navHistoryBtn');
    this.historySidebar = document.getElementById('historySidebar');
    this.closeHistoryBtn = document.getElementById('closeHistoryBtn');
    this.historyList = document.getElementById('historyList');
    
    this.exportBtn = document.getElementById('exportBtn');
    
    this.inlineTooltip = document.getElementById('inlineTooltip');
    this.tooltipSuggestion = document.getElementById('tooltipSuggestion');
    this.tooltipApplyBtn = document.getElementById('tooltipApplyBtn');
    
    // Toast
    this.toastContainer = document.getElementById('toastContainer');
  }

  _bindEvents() {
    // Tabs
    this.tabBtns.forEach(btn => {
      btn.addEventListener('click', () => this._switchTab(btn.dataset.tab));
    });

    // Textarea (contenteditable div)
    this.textarea.addEventListener('input', () => {
      this.charCount.textContent = this.textarea.innerText.length.toLocaleString();
      this.analyzeBtn.disabled = this.textarea.innerText.trim().length < 50;
    });

    // File Drop
    this.dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropZone.classList.add('dragover');
    });
    this.dropZone.addEventListener('dragleave', () => {
      this.dropZone.classList.remove('dragover');
    });
    this.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropZone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) this._readFile(file);
    });
    this.fileInput.addEventListener('change', (e) => {
      if (e.target.files[0]) this._readFile(e.target.files[0]);
    });

    // Samples
    this.sampleCards.forEach(card => {
      card.addEventListener('click', () => {
        const key = card.dataset.sample;
        if (SAMPLE_CONTRACTS[key]) {
          this.textarea.innerText = SAMPLE_CONTRACTS[key].text;
          this.charCount.textContent = this.textarea.innerText.length.toLocaleString();
          this.analyzeBtn.disabled = false;
          this._switchTab('paste');
          this._showToast('Sample contract loaded — click Analyze!');
        }
      });
    });

    // Analyze
    this.analyzeBtn.addEventListener('click', () => this._runAnalysis());
    
    // Clear
    this.clearBtn.addEventListener('click', () => {
      this.textarea.innerText = '';
      this.charCount.textContent = '0';
      this.analyzeBtn.disabled = true;
      this.resultsSection.classList.remove('visible');
      this.exportBtn.style.display = 'none';
      this._showToast('Cleared');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Filters
    this.filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        this.filterPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.activeFilter = pill.dataset.filter;
        this._renderClauseCards();
      });
    });

    // History Sidebar
    this.navHistoryBtn.addEventListener('click', () => {
      this.historySidebar.classList.add('open');
      this._renderHistory();
    });
    this.closeHistoryBtn.addEventListener('click', () => {
      this.historySidebar.classList.remove('open');
    });

    // Export Button
    this.exportBtn.addEventListener('click', () => this._exportReport());

    // Scroll-to-top
    this.scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  _initScrollObserver() {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 500) {
        this.scrollTopBtn.classList.add('visible');
      } else {
        this.scrollTopBtn.classList.remove('visible');
      }
    });
  }

  // ── Tab Switching ──
  _switchTab(tabId) {
    this.tabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    this.tabPanels.forEach(panel => {
      panel.classList.toggle('active', panel.id === `tab-${tabId}`);
    });
  }

  // ── File Reader ──
  _readFile(file) {
    const validTypes = ['text/plain', 'text/markdown', 'text/rtf', ''];
    const validExtensions = ['.txt', '.md', '.rtf'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();

    if (!validTypes.includes(file.type) && !validExtensions.includes(ext)) {
      this._showToast('Please upload a .txt or .md file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      this.textarea.innerText = e.target.result;
      this.charCount.textContent = this.textarea.innerText.length.toLocaleString();
      this.analyzeBtn.disabled = this.textarea.innerText.trim().length < 50;
      this._switchTab('paste');
      this._showToast(`Loaded: ${file.name}`);
    };
    reader.readAsText(file);
  }

  // ── Run Analysis ──
  async _runAnalysis() {
    const text = this.textarea.innerText.trim();
    if (text.length < 50) return;

    // Show loading state
    this.analyzeBtn.classList.add('loading');
    this.analyzeBtn.disabled = true;
    this.analyzingOverlay.classList.add('visible');

    // Simulate analysis time for UX feel (real analysis is instant)
    await this._delay(1800);

    // Run analyzer
    const analyzer = new ContractAnalyzer(text);
    this.results = analyzer.analyze();

    // Hide loading
    this.analyzingOverlay.classList.remove('visible');
    this.analyzeBtn.classList.remove('loading');
    this.analyzeBtn.disabled = false;

    // Render results
    this._renderDashboard();
    this._renderClauseCards();

    // Show results
    this.resultsSection.classList.add('visible');
    this.exportBtn.style.display = 'block';

    // Scroll to results
    await this._delay(200);
    this.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Save to history
    auth.saveAnalysis(this.results, text);
    if (document.getElementById('historyList')) {
      this._renderHistory();
    }

    this._showToast(`Found ${this.results.stats.totalFindings} issues across ${this.results.stats.totalClauses} sections`);
    
    // Phase 2: Apply inline highlights to the editor
    this._applyInlineHighlights();
  }

  // ── Phase 2: History Rendering ──
  _renderHistory() {
    if (!this.historyList) return;
    this.historyList.innerHTML = '';
    
    const history = auth.getHistory();
    if (!history || history.length === 0) {
      this.historyList.innerHTML = '<div class="history-empty">No past analyses found.</div>';
      return;
    }

    history.forEach((item, index) => {
      const el = document.createElement('div');
      el.className = 'history-item';
      
      const dateStr = new Date(item.date).toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      
      const snippet = item.textSnippet ? item.textSnippet + '...' : 'Contract snippet...';
      const color = this._getScoreColor(item.overallScore);

      el.innerHTML = `
        <div class="history-item-date">${dateStr}</div>
        <div style="font-size: 0.85rem; margin-bottom: 8px; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${snippet}
        </div>
        <div class="history-item-stats">
          <span class="history-item-score" style="color: ${color}">Score: ${item.overallScore}</span>
          <span style="color: var(--text-muted)">• ${item.totalFindings} Issues</span>
        </div>
      `;
      
      el.addEventListener('click', () => {
        this.historySidebar.classList.remove('open');
        this.textarea.innerText = auth.getHistoryFullText(index);
        this.charCount.textContent = this.textarea.innerText.length.toLocaleString();
        this.analyzeBtn.disabled = false;
        this._switchTab('paste');
        this._runAnalysis();
        this._showToast('Loaded past analysis');
      });
      
      this.historyList.appendChild(el);
    });
  }

  // ── Phase 2: Export Report ──
  _exportReport() {
    if (!this.results) return;
    
    let htmlContent = `
      <html>
      <head>
        <title>Contract Risk Analysis Report</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 40px 20px; }
          h1 { color: #1a1a1a; border-bottom: 2px solid #eaeaea; padding-bottom: 10px; }
          .summary { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
          .issue { border: 1px solid #eaeaea; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .issue-title { font-weight: 600; font-size: 1.1rem; margin-top: 0; }
          .severity-critical { color: #dc2626; }
          .severity-high { color: #ea580c; }
          .severity-medium { color: #ca8a04; }
          .severity-low { color: #16a34a; }
          .matched-text { background: #fee2e2; padding: 4px 8px; border-radius: 4px; display: inline-block; font-family: monospace; font-size: 0.9em; margin: 10px 0; border: 1px solid #fecaca; }
          .suggestion { background: #dcfce7; padding: 15px; border-radius: 4px; margin-top: 15px; border-left: 4px solid #22c55e; }
        </style>
      </head>
      <body>
        <h1>Contract Risk Analysis Report</h1>
        <div class="summary">
          <p><strong>Overall Risk Score:</strong> ${this.results.overallScore}/100</p>
          <p><strong>Verdict:</strong> ${this.results.overallVerdict.label}</p>
          <p><strong>Total Issues Found:</strong> ${this.results.stats.totalFindings}</p>
        </div>
        <h2>Detailed Findings</h2>
    `;

    this.results.findings.forEach(f => {
      htmlContent += `
        <div class="issue">
          <p class="issue-title severity-${f.severity}">${f.title} (${f.severity.toUpperCase()})</p>
          <p><strong>Found in section:</strong> ${f.clauseTitle}</p>
          <div class="matched-text">"${f.matchedText}"</div>
          <p><strong>Why it's risky:</strong> ${f.explanation}</p>
          <div class="suggestion">
            <strong>Safer Alternative:</strong><br>
            ${f.suggestion}
          </div>
        </div>
      `;
    });

    htmlContent += `
        <p style="text-align: center; margin-top: 40px; font-size: 0.85em; color: #666;">
          Generated by Contract Risk Analyzer<br>
          <em>Note: This is an automated analysis, not legal advice.</em>
        </p>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Contract-Risk-Report-${new Date().toISOString().slice(0,10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this._showToast('Report Downloaded');
  }

  // ── Phase 2: Inline Highlighting ──
  _applyInlineHighlights() {
    let plainText = this.textarea.innerText;
    // Create an array of characters to track replacements and avoid overlapping HTML tags
    let htmlSegments = plainText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    
    // Sort findings by length descending so we replace longest matches first
    const sortedFindings = [...this.results.findings].sort((a, b) => b.matchedText.length - a.matchedText.length);

    // Simple string replacement (Note: this works well for non-overlapping matches)
    sortedFindings.forEach((f) => {
      const escapedMatch = f.matchedText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
      // Find the original index in findings to link the data
      const originalIndex = this.results.findings.indexOf(f);
      
      const replacement = `<span class="risk-highlight ${f.severity}" data-id="${originalIndex}">${escapedMatch}</span>`;
      // We only replace the FIRST occurrence of this exact text to avoid messing up identical safe clauses if any
      htmlSegments = htmlSegments.replace(escapedMatch, replacement);
    });

    this.textarea.innerHTML = htmlSegments;

    // Bind click events
    const highlights = this.textarea.querySelectorAll('.risk-highlight');
    highlights.forEach(span => {
      span.addEventListener('click', (e) => {
        const finding = this.results.findings[span.dataset.id];
        this._showInlineTooltip(e.target, finding);
      });
    });

    // Hide tooltip on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.inline-tooltip') && !e.target.closest('.risk-highlight')) {
        this.inlineTooltip.classList.remove('visible');
      }
    });
    
    // Also hide if scrolling the editor
    this.textarea.addEventListener('scroll', () => {
      this.inlineTooltip.classList.remove('visible');
    });
  }

  _showInlineTooltip(targetEl, finding) {
    this.tooltipSuggestion.innerHTML = finding.suggestion || 'No suggestion available.';
    
    const rect = targetEl.getBoundingClientRect();
    this.inlineTooltip.style.top = (rect.top + window.scrollY - 15) + 'px';
    this.inlineTooltip.style.left = Math.max(10, rect.left + window.scrollX) + 'px';
    this.inlineTooltip.style.transform = 'translateY(-100%)';
    
    this.inlineTooltip.classList.add('visible');

    this.tooltipApplyBtn.onclick = () => {
      // Replace the span with plain text of the suggestion
      targetEl.outerHTML = finding.suggestion;
      this.inlineTooltip.classList.remove('visible');
      this._showToast('Fix applied! Re-analyze to update score.');
      this.analyzeBtn.disabled = false;
    };
  }

  // ── Render Dashboard ──
  _renderDashboard() {
    const { overallScore, overallVerdict, categoryScores, stats } = this.results;

    // Gauge
    const angle = (overallScore / 100) * 360;
    const color = this._getScoreColor(overallScore);
    
    // Animate gauge
    requestAnimationFrame(() => {
      this.gaugeRing.style.setProperty('--gauge-angle', '0deg');
      this.gaugeRing.style.setProperty('--gauge-color', color);
      requestAnimationFrame(() => {
        this.gaugeRing.style.setProperty('--gauge-angle', `${angle}deg`);
      });
    });

    // Animated score counter
    this._animateCounter(this.gaugeScore, 0, overallScore, 1500);
    
    this.gaugeVerdict.textContent = overallVerdict.label;
    this.gaugeVerdict.style.color = color;
    this.gaugeSublabel.textContent = overallVerdict.description;

    // Category Grid
    this.categoryGrid.innerHTML = '';
    const allCategories = Object.entries(RISK_PATTERNS);
    
    for (const [key, cat] of allCategories) {
      const score = categoryScores[key] || 0;
      const level = this._getLevel(score);
      const levelColor = this._getLevelColor(level);
      
      const tile = document.createElement('div');
      tile.className = 'category-tile';
      tile.innerHTML = `
        <div class="cat-icon" style="background: ${levelColor}15;">${cat.icon}</div>
        <div class="cat-info">
          <div class="cat-name">${cat.label}</div>
          <div class="cat-risk-label" style="color: ${levelColor};">${score > 0 ? level.toUpperCase() + ' RISK' : 'NO ISSUES'}</div>
          <div class="cat-bar">
            <div class="cat-bar-fill" style="background: ${levelColor};" data-width="${score}%"></div>
          </div>
        </div>
      `;
      this.categoryGrid.appendChild(tile);
    }

    // Animate bars after render
    requestAnimationFrame(() => {
      setTimeout(() => {
        document.querySelectorAll('.cat-bar-fill').forEach(bar => {
          bar.style.width = bar.dataset.width;
        });
      }, 200);
    });

    // Risk summary bar
    const total = stats.totalFindings || 1;
    this.riskSummaryBar.innerHTML = '';
    
    if (stats.low > 0) {
      const seg = document.createElement('div');
      seg.className = 'segment';
      seg.style.cssText = `flex: ${stats.low}; background: var(--risk-low);`;
      this.riskSummaryBar.appendChild(seg);
    }
    if (stats.medium > 0) {
      const seg = document.createElement('div');
      seg.className = 'segment';
      seg.style.cssText = `flex: ${stats.medium}; background: var(--risk-medium);`;
      this.riskSummaryBar.appendChild(seg);
    }
    if (stats.high > 0) {
      const seg = document.createElement('div');
      seg.className = 'segment';
      seg.style.cssText = `flex: ${stats.high}; background: var(--risk-high);`;
      this.riskSummaryBar.appendChild(seg);
    }
    if (stats.critical > 0) {
      const seg = document.createElement('div');
      seg.className = 'segment';
      seg.style.cssText = `flex: ${stats.critical}; background: var(--risk-critical);`;
      this.riskSummaryBar.appendChild(seg);
    }

    this.legendLow.textContent = `${stats.low} Low`;
    this.legendMedium.textContent = `${stats.medium} Medium`;
    this.legendHigh.textContent = `${stats.high} High`;
    this.legendCritical.textContent = `${stats.critical} Critical`;
  }

  // ── Render Clause Cards ──
  _renderClauseCards() {
    if (!this.results) return;
    
    let findings = this.results.findings;
    if (this.activeFilter !== 'all') {
      findings = findings.filter(f => f.severity === this.activeFilter);
    }

    this.clauseCards.innerHTML = '';

    if (findings.length === 0) {
      this.clauseCards.innerHTML = `
        <div style="text-align: center; padding: 3rem; color: var(--text-tertiary);">
          <div style="font-size: 1rem; font-weight: 500;">No issues found${this.activeFilter !== 'all' ? ' for this filter' : ''}!</div>
          <div style="font-size: 0.85rem; margin-top: 0.25rem;">
            ${this.activeFilter !== 'all' ? 'Try selecting a different risk level.' : 'This contract looks clean.'}
          </div>
        </div>`;
      return;
    }

    findings.forEach((finding, i) => {
      const card = document.createElement('div');
      card.className = `clause-card risk-${finding.severity}`;
      card.style.animationDelay = `${i * 0.08}s`;
      
      card.innerHTML = `
        <div class="clause-header">
          <div class="clause-category-icon" style="background: ${this._getLevelColor(finding.severity)}12;">
            ${finding.categoryIcon}
          </div>
          <div class="clause-header-info">
            <div class="clause-title">${finding.title}</div>
            <div class="clause-subtitle">
              ${finding.categoryLabel} · ${finding.clauseTitle}
            </div>
          </div>
          <span class="risk-badge ${finding.severity}">${finding.severity}</span>
          <span class="clause-chevron">▼</span>
        </div>
        <div class="clause-body">
          <div class="clause-content">
            <div class="original-text">
              <span class="original-text-label">From Contract</span>
              ${this._highlightMatch(finding.clauseText, finding.matchedText)}
            </div>
            <div class="issues-list">
              <div class="issue-item">
                <span class="issue-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>
                <div class="issue-content">
                  <div class="issue-title">What This Means For You</div>
                  <div class="issue-explanation">${finding.explanation}</div>
                </div>
              </div>
            </div>
            ${finding.suggestion ? `
            <div class="suggestion-box">
              <div class="suggestion-header">
                <span class="suggestion-label">Suggested Alternative</span>
                <button class="btn-copy" data-finding-index="${i}">
                  Copy
                </button>
              </div>
              <div class="suggestion-text">${finding.suggestion}</div>
            </div>` : ''}
          </div>
        </div>
      `;

      // Bind click events with proper closures (no inline handlers)
      card.querySelector('.clause-header').addEventListener('click', () => {
        card.classList.toggle('expanded');
      });

      const copyBtn = card.querySelector('.btn-copy');
      if (copyBtn && finding.suggestion) {
        copyBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.copyText(copyBtn, finding.suggestion);
        });
      }
      
      this.clauseCards.appendChild(card);
    });
  }

  _highlightMatch(text, match) {
    if (!match) return this._escapeHtml(text);
    const escaped = this._escapeHtml(text);
    const escapedMatch = this._escapeHtml(match);
    return escaped.replace(escapedMatch, `<mark style="background: rgba(239, 68, 68, 0.2); color: var(--risk-high); padding: 1px 4px; border-radius: 3px;">${escapedMatch}</mark>`);
  }

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Card Toggle ──
  toggleCard(headerEl) {
    const card = headerEl.closest('.clause-card');
    card.classList.toggle('expanded');
  }

  // ── Copy to Clipboard ──
  async copyText(btn, text) {
    try {
      await navigator.clipboard.writeText(text);
      btn.classList.add('copied');
      btn.innerHTML = 'Copied';
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.innerHTML = 'Copy';
      }, 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      btn.classList.add('copied');
      btn.innerHTML = 'Copied';
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.innerHTML = 'Copy';
      }, 2000);
    }
    this._showToast('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg> Copied to clipboard');
  }

  // ── Helpers ──
  _getScoreColor(score) {
    if (score >= 80) return '#dc2626';
    if (score >= 60) return '#ef4444';
    if (score >= 35) return '#f59e0b';
    if (score >= 15) return '#10b981';
    return '#10b981';
  }

  _getLevel(score) {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 35) return 'medium';
    if (score > 0) return 'low';
    return 'none';
  }

  _getLevelColor(level) {
    const colors = {
      critical: '#dc2626',
      high: '#ef4444',
      medium: '#f59e0b',
      low: '#10b981',
      none: '#64748b'
    };
    return colors[level] || colors.none;
  }

  _animateCounter(el, from, to, duration) {
    const start = performance.now();
    const step = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(from + (to - from) * eased);
      el.textContent = current;
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  _showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    this.toastContainer.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('leaving');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ── Auth & History UI ──
  _setupAuthNav() {
    const user = auth.getCurrentUser();
    if (!user) return;

    // User nav
    document.getElementById('navUserName').textContent = user.name;
    const avatar = document.getElementById('navAvatar');
    avatar.textContent = user.avatar.initials;
    avatar.style.background = user.avatar.color;

    // Dropdown toggle
    const navUser = document.getElementById('navUser');
    const dropdown = document.getElementById('navDropdown');
    navUser.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });
    document.addEventListener('click', () => dropdown.classList.remove('open'));

    // Logout
    document.getElementById('navLogoutBtn').addEventListener('click', () => {
      auth.logout();
      window.location.href = 'login.html';
    });

    // History Panel
    const historyBtn = document.getElementById('navHistoryBtn');
    const historyPanel = document.getElementById('historyPanel');
    const historyBackdrop = document.getElementById('historyBackdrop');
    const historyClose = document.getElementById('historyClose');

    const toggleHistory = () => {
      historyPanel.classList.toggle('open');
      historyBackdrop.classList.toggle('open');
      if (historyPanel.classList.contains('open')) {
        this._renderHistory();
      }
    };

    historyBtn.addEventListener('click', toggleHistory);
    historyClose.addEventListener('click', toggleHistory);
    historyBackdrop.addEventListener('click', toggleHistory);
  }

  _renderHistory() {
    const list = document.getElementById('historyList');
    if (!list) return;
    
    const items = auth.getHistory();

    if (items.length === 0) {
      list.innerHTML = `
        <div class="history-empty">
          <div class="history-empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 32px; height: 32px;"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div>
          <div class="history-empty-text">No analyses yet</div>
          <div class="history-empty-hint">Your saved contract reviews will appear here</div>
        </div>
      `;
      return;
    }

    list.innerHTML = '';
    items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'history-item';
      
      const date = new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const color = this._getScoreColor(item.overallScore);
      
      el.innerHTML = `
        <div class="history-item-top">
          <span class="history-item-score" style="color: ${color}">${item.overallScore}</span>
          <span class="history-item-date">${date}</span>
        </div>
        <div class="history-item-verdict" style="color: ${color}">${item.verdict}</div>
        <div class="history-item-preview">${this._escapeHtml(item.preview)}</div>
        <div class="history-item-stats">
          <span class="history-stat" style="background: rgba(220, 38, 38, 0.2); color: var(--risk-critical)">${item.critical} Critical</span>
          <span class="history-stat" style="background: rgba(239, 68, 68, 0.2); color: var(--risk-high)">${item.high} High</span>
        </div>
        <button class="history-item-delete" title="Delete">✕</button>
      `;

      el.querySelector('.history-item-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        auth.deleteHistoryItem(item.id);
        this._renderHistory();
      });

      list.appendChild(el);
    });
  }
}

// ── Initialize ──
let app;
document.addEventListener('DOMContentLoaded', () => {
  if (typeof auth !== 'undefined' && !auth.isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }
  app = new App();
  if (typeof auth !== 'undefined' && document.getElementById('navUser')) {
    app._setupAuthNav();
  }
});
