// One-time seed: ports the 60 templates that used to live in the static
// scorecard-templates.js + templates.html cards into the new `templates`
// table (see db.js). Safe to run more than once — an entry is skipped if a
// template with that slug already exists, so re-running after a partial
// failure just fills in what's missing rather than duplicating rows.
//
// Run from app/server:
//   DATABASE_URL="<production DATABASE_URL from Railway>" node scripts/seed-templates.js
// Or, from the Railway console (already inside the app with DATABASE_URL set):
//   node scripts/seed-templates.js

const crypto = require('node:crypto');
const { Pool } = require('pg');

const TEMPLATES = [
  {
    "slug": "property-buyer-readiness-scorecard",
    "title": "Property Buyer Readiness Scorecard",
    "description": "Qualify buyers by budget, timeline, and financing before a viewing.",
    "filterCategory": "realestate",
    "coverImage": "/covers/property-buyer-readiness-scorecard.svg",
    "intro": "A few honest questions about where you really are with your next move.",
    "categories": [
      {
        "key": "budget",
        "label": "Financial confidence"
      },
      {
        "key": "timeline",
        "label": "Urgency"
      },
      {
        "key": "certainty",
        "label": "Decision clarity"
      }
    ],
    "questions": [
      {
        "text": "What’s the main thing keeping you up at night about your current living situation?",
        "options": [
          {
            "label": "I genuinely feel stuck here",
            "score": {
              "timeline": 10,
              "certainty": 5
            }
          },
          {
            "label": "It’s fine for now, but I know it won’t last",
            "score": {
              "timeline": 5,
              "certainty": 5
            }
          },
          {
            "label": "Nothing really — just curious what’s out there",
            "score": {
              "timeline": 0,
              "certainty": 0
            }
          }
        ]
      },
      {
        "text": "If you’re honest with yourself, what’s really holding you back from making a move?",
        "options": [
          {
            "label": "Money — I’m not sure I can afford it yet",
            "score": {
              "budget": 0
            }
          },
          {
            "label": "Timing — I haven’t found the right moment",
            "score": {
              "timeline": 0
            }
          },
          {
            "label": "Nothing’s really holding me back",
            "score": {
              "budget": 10,
              "timeline": 10
            }
          }
        ]
      },
      {
        "text": "How do you feel when you actually sit down and think about your finances for this?",
        "options": [
          {
            "label": "Confident — I know exactly where I stand",
            "score": {
              "budget": 10
            }
          },
          {
            "label": "A bit anxious — I haven’t looked closely",
            "score": {
              "budget": 5
            }
          },
          {
            "label": "Overwhelmed — I tend to avoid it",
            "score": {
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "What would it actually cost you — emotionally or practically — if this drags on another year?",
        "options": [
          {
            "label": "A lot — it would really affect me",
            "score": {
              "timeline": 10
            }
          },
          {
            "label": "Some disappointment, but I’d manage",
            "score": {
              "timeline": 5
            }
          },
          {
            "label": "Honestly, not much would change",
            "score": {
              "timeline": 0
            }
          }
        ]
      },
      {
        "text": "When you picture the place you actually want, how clear is that picture in your head?",
        "options": [
          {
            "label": "Crystal clear — I know exactly what I want",
            "score": {
              "certainty": 10
            }
          },
          {
            "label": "I have a rough idea",
            "score": {
              "certainty": 5
            }
          },
          {
            "label": "I haven’t really let myself think about it",
            "score": {
              "certainty": 0
            }
          }
        ]
      },
      {
        "text": "What’s the biggest fear running through your mind about this decision?",
        "options": [
          {
            "label": "Making a costly mistake I can’t undo",
            "score": {
              "certainty": 0,
              "budget": 0
            }
          },
          {
            "label": "Missing out on something good while I wait",
            "score": {
              "timeline": 10,
              "certainty": 5
            }
          },
          {
            "label": "I don’t really have fears about it",
            "score": {
              "certainty": 10,
              "budget": 10
            }
          }
        ]
      },
      {
        "text": "Who else’s opinion weighs on this decision besides yours?",
        "options": [
          {
            "label": "Nobody — this one’s mine to make",
            "score": {
              "certainty": 10
            }
          },
          {
            "label": "My partner or family, and we’re aligned",
            "score": {
              "certainty": 5
            }
          },
          {
            "label": "A few people, and we haven’t agreed yet",
            "score": {
              "certainty": 0
            }
          }
        ]
      },
      {
        "text": "Has there been a recent moment that made you think \"I really need to sort this out\"?",
        "options": [
          {
            "label": "Yes, more than once",
            "score": {
              "timeline": 10,
              "certainty": 5
            }
          },
          {
            "label": "Once or twice, in passing",
            "score": {
              "timeline": 5,
              "certainty": 0
            }
          },
          {
            "label": "Not really",
            "score": {
              "timeline": 0,
              "certainty": 0
            }
          }
        ]
      },
      {
        "text": "What’s stopped you from having the money conversation with someone who could actually help?",
        "options": [
          {
            "label": "Nothing — I’ve already started that conversation",
            "score": {
              "budget": 10
            }
          },
          {
            "label": "I’ve been meaning to, just haven’t yet",
            "score": {
              "budget": 5
            }
          },
          {
            "label": "I don’t feel ready for that conversation",
            "score": {
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "If the right place landed in front of you tomorrow, how would you actually feel?",
        "options": [
          {
            "label": "Relieved and ready to move on it immediately",
            "score": {
              "timeline": 10,
              "certainty": 10,
              "budget": 10
            }
          },
          {
            "label": "Excited, but I’d need to sort a few things first",
            "score": {
              "timeline": 5,
              "certainty": 5,
              "budget": 5
            }
          },
          {
            "label": "Nervous — I don’t think I’m there yet",
            "score": {
              "timeline": 0,
              "certainty": 0,
              "budget": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Ready to view"
      },
      {
        "min": 40,
        "label": "Getting there"
      },
      {
        "min": 0,
        "label": "Early stage"
      }
    ],
    "ctaLabel": "Book a viewing",
    "sortOrder": 0
  },
  {
    "slug": "rental-tenant-screening-quiz",
    "title": "Rental Tenant Screening Quiz",
    "description": "Pre-screen tenants on budget and move-in timeline automatically.",
    "filterCategory": "realestate",
    "coverImage": "/covers/rental-tenant-screening-quiz.svg",
    "intro": "A few honest questions about your search so far, and what’s actually been getting in the way.",
    "categories": [
      {
        "key": "budget",
        "label": "Budget fit"
      },
      {
        "key": "readiness",
        "label": "Move-in readiness"
      },
      {
        "key": "stability",
        "label": "Situation stability"
      }
    ],
    "questions": [
      {
        "text": "What’s actually happening with your current place that’s pushing you to look?",
        "options": [
          {
            "label": "I have to be out by a specific date",
            "score": {
              "readiness": 10,
              "stability": 5
            }
          },
          {
            "label": "It’s just not working for me anymore",
            "score": {
              "readiness": 5,
              "stability": 5
            }
          },
          {
            "label": "Nothing urgent, just browsing",
            "score": {
              "readiness": 0,
              "stability": 0
            }
          }
        ]
      },
      {
        "text": "When you think about rent, what’s the honest feeling?",
        "options": [
          {
            "label": "Comfortable — it won’t stretch me",
            "score": {
              "budget": 10
            }
          },
          {
            "label": "It’ll be tight some months",
            "score": {
              "budget": 5
            }
          },
          {
            "label": "I genuinely haven’t worked it out",
            "score": {
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "What’s the one document or piece of paperwork you’re dreading having to sort out?",
        "options": [
          {
            "label": "Nothing — I already have everything ready",
            "score": {
              "readiness": 10
            }
          },
          {
            "label": "One or two things I still need to get",
            "score": {
              "readiness": 5
            }
          },
          {
            "label": "Honestly, most of it",
            "score": {
              "readiness": 0
            }
          }
        ]
      },
      {
        "text": "How stable is your income right now?",
        "options": [
          {
            "label": "Very stable, same source for a while",
            "score": {
              "stability": 10,
              "budget": 5
            }
          },
          {
            "label": "Stable but recent or mixed",
            "score": {
              "stability": 5,
              "budget": 5
            }
          },
          {
            "label": "Unpredictable month to month",
            "score": {
              "stability": 0,
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "What’s worried you most in past rental applications, if any?",
        "options": [
          {
            "label": "Nothing, I haven’t had issues before",
            "score": {
              "stability": 10
            }
          },
          {
            "label": "Getting references together in time",
            "score": {
              "stability": 5
            }
          },
          {
            "label": "Being turned down without knowing why",
            "score": {
              "stability": 0
            }
          }
        ]
      },
      {
        "text": "If the perfect place came up tomorrow, could you act on it immediately?",
        "options": [
          {
            "label": "Yes, I could move fast",
            "score": {
              "readiness": 10,
              "budget": 10
            }
          },
          {
            "label": "I’d need a few days to sort things",
            "score": {
              "readiness": 5,
              "budget": 5
            }
          },
          {
            "label": "No, I’d need more time",
            "score": {
              "readiness": 0,
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "What’s the real reason you haven’t signed a lease yet?",
        "options": [
          {
            "label": "Haven’t found the right place",
            "score": {
              "readiness": 5,
              "budget": 5
            }
          },
          {
            "label": "Still saving up / getting finances in order",
            "score": {
              "budget": 0
            }
          },
          {
            "label": "Nothing’s stopping me — I just started looking",
            "score": {
              "readiness": 10,
              "budget": 10
            }
          }
        ]
      },
      {
        "text": "How does it feel filling out a rental application, if you’re honest?",
        "options": [
          {
            "label": "Straightforward — I know I’ll qualify",
            "score": {
              "stability": 10,
              "readiness": 10
            }
          },
          {
            "label": "A little stressful, not sure how it’ll go",
            "score": {
              "stability": 5,
              "readiness": 5
            }
          },
          {
            "label": "Stressful — I’ve worried about being rejected",
            "score": {
              "stability": 0,
              "readiness": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Ready to move in"
      },
      {
        "min": 40,
        "label": "Nearly there"
      },
      {
        "min": 0,
        "label": "Still preparing"
      }
    ],
    "ctaLabel": "See available units",
    "sortOrder": 1
  },
  {
    "slug": "property-investment-assessment",
    "title": "Property Investment Assessment",
    "description": "Score investor readiness and match them to the right listings.",
    "filterCategory": "realestate",
    "coverImage": "/covers/property-investment-assessment.svg",
    "intro": "A short, honest look at where you really stand as an investor — not just the numbers.",
    "categories": [
      {
        "key": "capital",
        "label": "Capital readiness"
      },
      {
        "key": "goals",
        "label": "Investment clarity"
      },
      {
        "key": "risk",
        "label": "Risk appetite"
      }
    ],
    "questions": [
      {
        "text": "What’s actually motivating you to look at property investment right now?",
        "options": [
          {
            "label": "I want money working for me, not just sitting idle",
            "score": {
              "goals": 10
            }
          },
          {
            "label": "Everyone around me is doing it and I don’t want to miss out",
            "score": {
              "goals": 5
            }
          },
          {
            "label": "Honestly, I’m not sure yet",
            "score": {
              "goals": 0
            }
          }
        ]
      },
      {
        "text": "If you’re honest, how ready is your capital right now?",
        "options": [
          {
            "label": "Sitting ready, waiting for the right opportunity",
            "score": {
              "capital": 10
            }
          },
          {
            "label": "Building up, not quite there",
            "score": {
              "capital": 5
            }
          },
          {
            "label": "Nowhere close yet",
            "score": {
              "capital": 0
            }
          }
        ]
      },
      {
        "text": "What’s your gut reaction to the idea of a property losing value for a while before it recovers?",
        "options": [
          {
            "label": "I can stomach that, I’m playing the long game",
            "score": {
              "risk": 10
            }
          },
          {
            "label": "It would worry me, but I’d hold on",
            "score": {
              "risk": 5
            }
          },
          {
            "label": "That would seriously stress me out",
            "score": {
              "risk": 0
            }
          }
        ]
      },
      {
        "text": "Have you ever put money into something that didn’t pay off the way you expected?",
        "options": [
          {
            "label": "Yes, and I learned from it — doesn’t scare me off",
            "score": {
              "risk": 10,
              "goals": 5
            }
          },
          {
            "label": "Once, and it made me more cautious",
            "score": {
              "risk": 5,
              "goals": 5
            }
          },
          {
            "label": "No, and that uncertainty makes me nervous",
            "score": {
              "risk": 0,
              "goals": 0
            }
          }
        ]
      },
      {
        "text": "What keeps you up at night about your current finances?",
        "options": [
          {
            "label": "Nothing really — I’m in a solid position",
            "score": {
              "capital": 10
            }
          },
          {
            "label": "A bit of uncertainty, but manageable",
            "score": {
              "capital": 5
            }
          },
          {
            "label": "A lot — money feels tight most months",
            "score": {
              "capital": 0
            }
          }
        ]
      },
      {
        "text": "How clear are you on what \"success\" actually looks like for this investment?",
        "options": [
          {
            "label": "Very clear — I have a specific number or outcome in mind",
            "score": {
              "goals": 10
            }
          },
          {
            "label": "Somewhat — I have a general direction",
            "score": {
              "goals": 5
            }
          },
          {
            "label": "Not clear at all",
            "score": {
              "goals": 0
            }
          }
        ]
      },
      {
        "text": "Has a past investment (property or otherwise) ever left you feeling burned?",
        "options": [
          {
            "label": "No, my experience has been positive so far",
            "score": {
              "capital": 10,
              "risk": 10
            }
          },
          {
            "label": "Once before, but I’ve moved past it",
            "score": {
              "capital": 5,
              "risk": 5
            }
          },
          {
            "label": "Yes, and it still affects how I think about this",
            "score": {
              "capital": 0,
              "risk": 0
            }
          }
        ]
      },
      {
        "text": "What would it mean for you personally if this investment worked out well?",
        "options": [
          {
            "label": "Real financial freedom or security for my family",
            "score": {
              "goals": 10,
              "risk": 5
            }
          },
          {
            "label": "A nice extra income stream",
            "score": {
              "goals": 5,
              "risk": 5
            }
          },
          {
            "label": "I haven’t thought that far ahead",
            "score": {
              "goals": 0,
              "risk": 0
            }
          }
        ]
      },
      {
        "text": "How do you feel about handing over a large sum of money to someone else to manage on your behalf?",
        "options": [
          {
            "label": "Fine, as long as they’ve proven themselves",
            "score": {
              "risk": 10,
              "capital": 5
            }
          },
          {
            "label": "Cautious — I’d want a lot of reassurance",
            "score": {
              "risk": 5,
              "capital": 5
            }
          },
          {
            "label": "Very uncomfortable with that idea",
            "score": {
              "risk": 0,
              "capital": 0
            }
          }
        ]
      },
      {
        "text": "What’s stopped you from making a move on this before now?",
        "options": [
          {
            "label": "Nothing really — I just hadn’t found the right opportunity",
            "score": {
              "capital": 10,
              "goals": 10
            }
          },
          {
            "label": "I’ve been researching and building confidence",
            "score": {
              "capital": 5,
              "goals": 5
            }
          },
          {
            "label": "Fear of making the wrong call",
            "score": {
              "capital": 0,
              "goals": 0
            }
          }
        ]
      },
      {
        "text": "Have you invested in property before?",
        "options": [
          {
            "label": "Yes, more than once",
            "score": {
              "capital": 10,
              "goals": 10,
              "risk": 10
            }
          },
          {
            "label": "Once before",
            "score": {
              "capital": 5,
              "goals": 5,
              "risk": 5
            }
          },
          {
            "label": "This would be my first",
            "score": {
              "capital": 0,
              "goals": 0,
              "risk": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Investor-ready"
      },
      {
        "min": 40,
        "label": "Building toward it"
      },
      {
        "min": 0,
        "label": "Exploring options"
      }
    ],
    "ctaLabel": "Talk to an investment advisor",
    "sortOrder": 2
  },
  {
    "slug": "business-financial-health-check",
    "title": "Business Financial Health Check",
    "description": "A 12-question audit of a business's financial fundamentals.",
    "filterCategory": "finance",
    "coverImage": "/covers/business-financial-health-check.svg",
    "intro": "An honest look at how your business really feels financially, month to month.",
    "categories": [
      {
        "key": "cashflow",
        "label": "Cash flow confidence"
      },
      {
        "key": "records",
        "label": "Financial visibility"
      },
      {
        "key": "stress",
        "label": "Financial stress"
      }
    ],
    "questions": [
      {
        "text": "What’s the feeling in the days just before payroll or major bills are due?",
        "options": [
          {
            "label": "Calm — I already know it’s covered",
            "score": {
              "cashflow": 10,
              "stress": 10
            }
          },
          {
            "label": "A little tense, but it usually works out",
            "score": {
              "cashflow": 5,
              "stress": 5
            }
          },
          {
            "label": "Genuinely stressful, every time",
            "score": {
              "cashflow": 0,
              "stress": 0
            }
          }
        ]
      },
      {
        "text": "If someone asked you right now what your business made last month, could you answer confidently?",
        "options": [
          {
            "label": "Yes, immediately and accurately",
            "score": {
              "records": 10
            }
          },
          {
            "label": "I’d need to check first",
            "score": {
              "records": 5
            }
          },
          {
            "label": "Honestly, I’d be guessing",
            "score": {
              "records": 0
            }
          }
        ]
      },
      {
        "text": "Who do you currently turn to when a money decision feels too big to make alone?",
        "options": [
          {
            "label": "My accountant or financial advisor",
            "score": {
              "cashflow": 10,
              "records": 10
            }
          },
          {
            "label": "I ask around informally",
            "score": {
              "cashflow": 5,
              "records": 5
            }
          },
          {
            "label": "I usually just decide alone and hope for the best",
            "score": {
              "cashflow": 0,
              "records": 0
            }
          }
        ]
      },
      {
        "text": "What keeps you up at night about the business financially?",
        "options": [
          {
            "label": "Nothing major — I sleep fine",
            "score": {
              "stress": 10
            }
          },
          {
            "label": "Occasional worry about a slow month",
            "score": {
              "stress": 5
            }
          },
          {
            "label": "Real anxiety about whether we’ll make it through",
            "score": {
              "stress": 0
            }
          }
        ]
      },
      {
        "text": "Has there been a moment recently where a bill or expense caught you completely off guard?",
        "options": [
          {
            "label": "No, I generally see things coming",
            "score": {
              "records": 10,
              "stress": 5
            }
          },
          {
            "label": "Once or twice",
            "score": {
              "records": 5,
              "stress": 5
            }
          },
          {
            "label": "Yes, more often than I’d like to admit",
            "score": {
              "records": 0,
              "stress": 0
            }
          }
        ]
      },
      {
        "text": "How do you currently track what’s coming in versus going out?",
        "options": [
          {
            "label": "A proper system, reviewed regularly",
            "score": {
              "records": 10
            }
          },
          {
            "label": "A spreadsheet I update sometimes",
            "score": {
              "records": 5
            }
          },
          {
            "label": "Mostly in my head",
            "score": {
              "records": 0
            }
          }
        ]
      },
      {
        "text": "When was the last time you felt truly in control of the business’s money?",
        "options": [
          {
            "label": "I feel that way most of the time",
            "score": {
              "cashflow": 10,
              "stress": 10
            }
          },
          {
            "label": "It comes and goes",
            "score": {
              "cashflow": 5,
              "stress": 5
            }
          },
          {
            "label": "Honestly, it’s been a while",
            "score": {
              "cashflow": 0,
              "stress": 0
            }
          }
        ]
      },
      {
        "text": "If cash got tight for two months straight, what would actually happen?",
        "options": [
          {
            "label": "We have a buffer — we’d be fine",
            "score": {
              "cashflow": 10
            }
          },
          {
            "label": "It would be uncomfortable but survivable",
            "score": {
              "cashflow": 5
            }
          },
          {
            "label": "It would be a serious crisis",
            "score": {
              "cashflow": 0
            }
          }
        ]
      },
      {
        "text": "How do you feel about your current tax and compliance position?",
        "options": [
          {
            "label": "Confident — everything’s in order",
            "score": {
              "records": 10,
              "stress": 10
            }
          },
          {
            "label": "Mostly fine, a few grey areas",
            "score": {
              "records": 5,
              "stress": 5
            }
          },
          {
            "label": "Worried I’m missing something",
            "score": {
              "records": 0,
              "stress": 0
            }
          }
        ]
      },
      {
        "text": "What’s the real reason you haven’t brought in outside financial help before now?",
        "options": [
          {
            "label": "Never felt the need — things run smoothly",
            "score": {
              "cashflow": 10,
              "records": 10
            }
          },
          {
            "label": "Been meaning to, just hasn’t happened yet",
            "score": {
              "cashflow": 5,
              "records": 5
            }
          },
          {
            "label": "Worried about what they might find",
            "score": {
              "cashflow": 0,
              "records": 0
            }
          }
        ]
      },
      {
        "text": "Do you currently work with an accountant?",
        "options": [
          {
            "label": "Yes",
            "score": {
              "cashflow": 10,
              "records": 10,
              "stress": 10
            }
          },
          {
            "label": "Occasionally",
            "score": {
              "cashflow": 5,
              "records": 5,
              "stress": 5
            }
          },
          {
            "label": "No",
            "score": {
              "cashflow": 0,
              "records": 0,
              "stress": 0
            }
          }
        ]
      },
      {
        "text": "If your finances were sorted out properly, what would actually change for you day to day?",
        "options": [
          {
            "label": "I’d finally stop worrying about it",
            "score": {
              "stress": 10
            }
          },
          {
            "label": "I’d make better decisions, faster",
            "score": {
              "records": 10
            }
          },
          {
            "label": "Not much — I don’t think about it much anyway",
            "score": {
              "stress": 0,
              "records": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Financially healthy"
      },
      {
        "min": 40,
        "label": "Room to improve"
      },
      {
        "min": 0,
        "label": "Needs attention"
      }
    ],
    "ctaLabel": "Book a free financial review",
    "sortOrder": 3
  },
  {
    "slug": "insurance-needs-analysis",
    "title": "Insurance Needs Analysis",
    "description": "Route qualified prospects straight to the right adviser.",
    "filterCategory": "finance",
    "coverImage": "/covers/insurance-needs-analysis.svg",
    "intro": "A few honest questions about the risks you actually worry about.",
    "categories": [
      {
        "key": "exposure",
        "label": "Risk exposure"
      },
      {
        "key": "coverage",
        "label": "Current coverage"
      },
      {
        "key": "peace",
        "label": "Peace of mind"
      }
    ],
    "questions": [
      {
        "text": "What’s the scenario that actually worries you if something went wrong tomorrow?",
        "options": [
          {
            "label": "My family being left without support",
            "score": {
              "exposure": 10,
              "peace": 0
            }
          },
          {
            "label": "Losing income I can’t easily replace",
            "score": {
              "exposure": 10,
              "peace": 5
            }
          },
          {
            "label": "I haven’t really thought about it",
            "score": {
              "exposure": 0,
              "peace": 0
            }
          }
        ]
      },
      {
        "text": "If you got a serious diagnosis or had a bad accident this month, what would actually happen financially?",
        "options": [
          {
            "label": "I’m covered, I wouldn’t worry",
            "score": {
              "coverage": 10,
              "peace": 10
            }
          },
          {
            "label": "I’d manage, but it would hurt",
            "score": {
              "coverage": 5,
              "peace": 5
            }
          },
          {
            "label": "It would be a real crisis",
            "score": {
              "coverage": 0,
              "peace": 0
            }
          }
        ]
      },
      {
        "text": "Has something happened to you or someone close that made you think about this more seriously?",
        "options": [
          {
            "label": "Yes, and it changed how I think about risk",
            "score": {
              "exposure": 10
            }
          },
          {
            "label": "Something small, but it stuck with me",
            "score": {
              "exposure": 5
            }
          },
          {
            "label": "No, nothing specific",
            "score": {
              "exposure": 0
            }
          }
        ]
      },
      {
        "text": "How often do you actually think about \"what if something happened to me\"?",
        "options": [
          {
            "label": "Fairly often — it’s on my mind",
            "score": {
              "exposure": 10,
              "peace": 0
            }
          },
          {
            "label": "Occasionally, in passing",
            "score": {
              "exposure": 5,
              "peace": 5
            }
          },
          {
            "label": "Rarely, I try not to dwell on it",
            "score": {
              "exposure": 0,
              "peace": 10
            }
          }
        ]
      },
      {
        "text": "Do you know, right now, exactly what you are and aren’t covered for?",
        "options": [
          {
            "label": "Yes, I know my policy well",
            "score": {
              "coverage": 10
            }
          },
          {
            "label": "Roughly, not in detail",
            "score": {
              "coverage": 5
            }
          },
          {
            "label": "Not really, or I have nothing",
            "score": {
              "coverage": 0
            }
          }
        ]
      },
      {
        "text": "What would it mean for you personally to stop worrying about this?",
        "options": [
          {
            "label": "Real relief — it weighs on me more than I admit",
            "score": {
              "peace": 10
            }
          },
          {
            "label": "It would be nice, but I’m not stressed about it",
            "score": {
              "peace": 5
            }
          },
          {
            "label": "It genuinely doesn’t bother me",
            "score": {
              "peace": 0
            }
          }
        ]
      },
      {
        "text": "Has an unexpected expense ever thrown your finances off track?",
        "options": [
          {
            "label": "Yes, and I don’t want that to happen again",
            "score": {
              "exposure": 10,
              "coverage": 0
            }
          },
          {
            "label": "A minor one, nothing major",
            "score": {
              "exposure": 5,
              "coverage": 5
            }
          },
          {
            "label": "No, I’ve been fortunate",
            "score": {
              "exposure": 0,
              "coverage": 10
            }
          }
        ]
      },
      {
        "text": "Who’s depending on you financially right now?",
        "options": [
          {
            "label": "Several people rely on my income",
            "score": {
              "exposure": 10,
              "peace": 0
            }
          },
          {
            "label": "One or two people, partly",
            "score": {
              "exposure": 5,
              "peace": 5
            }
          },
          {
            "label": "Just myself",
            "score": {
              "exposure": 0,
              "peace": 10
            }
          }
        ]
      },
      {
        "text": "Have you had a claim or major loss in the last 2 years?",
        "options": [
          {
            "label": "Yes",
            "score": {
              "exposure": 10,
              "coverage": 0,
              "peace": 0
            }
          },
          {
            "label": "No, but I’m concerned about risk",
            "score": {
              "exposure": 5,
              "coverage": 5,
              "peace": 5
            }
          },
          {
            "label": "No",
            "score": {
              "exposure": 0,
              "coverage": 10,
              "peace": 10
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Well protected"
      },
      {
        "min": 40,
        "label": "Some gaps"
      },
      {
        "min": 0,
        "label": "Under-insured"
      }
    ],
    "ctaLabel": "Speak to an adviser",
    "sortOrder": 4
  },
  {
    "slug": "the-tax-savings-scorecard",
    "title": "The Tax Savings Scorecard",
    "description": "Turn a free tax check into a steady stream of SME enquiries.",
    "filterCategory": "finance",
    "coverImage": "/covers/the-tax-savings-scorecard.svg",
    "intro": "A few honest questions about how tax season actually feels for your business.",
    "categories": [
      {
        "key": "compliance",
        "label": "Compliance confidence"
      },
      {
        "key": "planning",
        "label": "Tax planning"
      },
      {
        "key": "anxiety",
        "label": "Tax anxiety"
      }
    ],
    "questions": [
      {
        "text": "What’s the feeling in your stomach when tax season rolls around?",
        "options": [
          {
            "label": "Calm — nothing to worry about",
            "score": {
              "anxiety": 10,
              "compliance": 10
            }
          },
          {
            "label": "A bit of dread, honestly",
            "score": {
              "anxiety": 5,
              "compliance": 5
            }
          },
          {
            "label": "Real anxiety — I avoid thinking about it",
            "score": {
              "anxiety": 0,
              "compliance": 0
            }
          }
        ]
      },
      {
        "text": "Have you ever had a moment of panic wondering if you filed something wrong?",
        "options": [
          {
            "label": "No, I trust our filings completely",
            "score": {
              "compliance": 10
            }
          },
          {
            "label": "Once or twice, briefly",
            "score": {
              "compliance": 5
            }
          },
          {
            "label": "Yes, more than I’d like to admit",
            "score": {
              "compliance": 0
            }
          }
        ]
      },
      {
        "text": "If someone told you that you overpaid tax last year, how would that make you feel?",
        "options": [
          {
            "label": "Not surprised — I suspect that already",
            "score": {
              "planning": 0,
              "anxiety": 0
            }
          },
          {
            "label": "Annoyed, but I wouldn’t be shocked",
            "score": {
              "planning": 5,
              "anxiety": 5
            }
          },
          {
            "label": "Surprised — I actively plan for this",
            "score": {
              "planning": 10,
              "anxiety": 10
            }
          }
        ]
      },
      {
        "text": "When did you last actually sit down and review your tax setup with a professional?",
        "options": [
          {
            "label": "Within the last year",
            "score": {
              "compliance": 10,
              "planning": 10
            }
          },
          {
            "label": "Over a year ago",
            "score": {
              "compliance": 5,
              "planning": 5
            }
          },
          {
            "label": "Never",
            "score": {
              "compliance": 0,
              "planning": 0
            }
          }
        ]
      },
      {
        "text": "What happens in your business when a filing deadline is approaching?",
        "options": [
          {
            "label": "Nothing — it’s already handled well ahead of time",
            "score": {
              "compliance": 10,
              "anxiety": 10
            }
          },
          {
            "label": "A last-minute scramble, but we make it",
            "score": {
              "compliance": 5,
              "anxiety": 5
            }
          },
          {
            "label": "Genuine stress and late nights",
            "score": {
              "compliance": 0,
              "anxiety": 0
            }
          }
        ]
      },
      {
        "text": "Do you know, off the top of your head, which reliefs or deductions your business actually qualifies for?",
        "options": [
          {
            "label": "Yes, I track this closely",
            "score": {
              "planning": 10
            }
          },
          {
            "label": "Vaguely, not in detail",
            "score": {
              "planning": 5
            }
          },
          {
            "label": "No idea, honestly",
            "score": {
              "planning": 0
            }
          }
        ]
      },
      {
        "text": "Has an unexpected tax bill ever caught your business off guard?",
        "options": [
          {
            "label": "No, never",
            "score": {
              "anxiety": 10,
              "planning": 5
            }
          },
          {
            "label": "Once, and it stung",
            "score": {
              "anxiety": 5,
              "planning": 5
            }
          },
          {
            "label": "Yes, more than once",
            "score": {
              "anxiety": 0,
              "planning": 0
            }
          }
        ]
      },
      {
        "text": "What would it actually mean for you if tax stopped being a source of stress?",
        "options": [
          {
            "label": "A real weight off my shoulders",
            "score": {
              "anxiety": 10
            }
          },
          {
            "label": "Nice, but not a big deal either way",
            "score": {
              "anxiety": 5
            }
          },
          {
            "label": "It doesn’t stress me currently",
            "score": {
              "anxiety": 0
            }
          }
        ]
      },
      {
        "text": "Are your tax filings up to date right now?",
        "options": [
          {
            "label": "Yes, fully current",
            "score": {
              "compliance": 10,
              "planning": 10,
              "anxiety": 10
            }
          },
          {
            "label": "Mostly, some gaps",
            "score": {
              "compliance": 5,
              "planning": 5,
              "anxiety": 5
            }
          },
          {
            "label": "Behind",
            "score": {
              "compliance": 0,
              "planning": 0,
              "anxiety": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Tax-efficient"
      },
      {
        "min": 40,
        "label": "Some savings available"
      },
      {
        "min": 0,
        "label": "Likely overpaying"
      }
    ],
    "ctaLabel": "Get a free tax review",
    "sortOrder": 5
  },
  {
    "slug": "cybersecurity-risk-score",
    "title": "Cybersecurity Risk Score",
    "description": "How secure is this business, really? A lead magnet for MSPs.",
    "filterCategory": "it",
    "coverImage": "/covers/cybersecurity-risk-score.svg",
    "intro": "An honest look at how exposed your business actually is, not just a checklist.",
    "categories": [
      {
        "key": "protection",
        "label": "Protection"
      },
      {
        "key": "awareness",
        "label": "Team awareness"
      },
      {
        "key": "fear",
        "label": "Breach anxiety"
      }
    ],
    "questions": [
      {
        "text": "If your systems got hacked tonight, how would you actually find out?",
        "options": [
          {
            "label": "We’d know instantly — we have monitoring in place",
            "score": {
              "protection": 10
            }
          },
          {
            "label": "Probably when something visibly broke",
            "score": {
              "protection": 5
            }
          },
          {
            "label": "Honestly, we might not notice for a while",
            "score": {
              "protection": 0
            }
          }
        ]
      },
      {
        "text": "Has someone on your team ever clicked something they probably shouldn’t have?",
        "options": [
          {
            "label": "Not that I know of",
            "score": {
              "awareness": 10
            }
          },
          {
            "label": "Maybe, we’re not fully sure",
            "score": {
              "awareness": 5
            }
          },
          {
            "label": "Yes, and it worried me",
            "score": {
              "awareness": 0
            }
          }
        ]
      },
      {
        "text": "What’s the feeling when you think about your business’s data being exposed?",
        "options": [
          {
            "label": "Not too worried, we’re prepared",
            "score": {
              "fear": 10,
              "protection": 10
            }
          },
          {
            "label": "A background worry I don’t act on",
            "score": {
              "fear": 5,
              "protection": 5
            }
          },
          {
            "label": "Real anxiety — it keeps me up sometimes",
            "score": {
              "fear": 0,
              "protection": 0
            }
          }
        ]
      },
      {
        "text": "Do you use multi-factor authentication on your business accounts?",
        "options": [
          {
            "label": "Yes, everywhere",
            "score": {
              "protection": 10
            }
          },
          {
            "label": "On some accounts",
            "score": {
              "protection": 5
            }
          },
          {
            "label": "No",
            "score": {
              "protection": 0
            }
          }
        ]
      },
      {
        "text": "Has anyone in your business ever received a suspicious payment or wire request that looked real?",
        "options": [
          {
            "label": "No, never",
            "score": {
              "fear": 10,
              "awareness": 5
            }
          },
          {
            "label": "Yes, but we caught it in time",
            "score": {
              "fear": 5,
              "awareness": 10
            }
          },
          {
            "label": "Yes, and it worried us badly",
            "score": {
              "fear": 0,
              "awareness": 0
            }
          }
        ]
      },
      {
        "text": "If you had to guess right now, how confident are you that your passwords and access are actually secure?",
        "options": [
          {
            "label": "Very confident",
            "score": {
              "protection": 10,
              "awareness": 10
            }
          },
          {
            "label": "Somewhat, I have doubts",
            "score": {
              "protection": 5,
              "awareness": 5
            }
          },
          {
            "label": "Not confident at all",
            "score": {
              "protection": 0,
              "awareness": 0
            }
          }
        ]
      },
      {
        "text": "Has your team had any real security training, beyond a one-off email?",
        "options": [
          {
            "label": "Yes, regularly",
            "score": {
              "awareness": 10
            }
          },
          {
            "label": "Once, a while ago",
            "score": {
              "awareness": 5
            }
          },
          {
            "label": "Never",
            "score": {
              "awareness": 0
            }
          }
        ]
      },
      {
        "text": "What would actually happen to the business if you lost access to everything for a full day?",
        "options": [
          {
            "label": "Minor disruption, we’d recover fast",
            "score": {
              "protection": 10,
              "fear": 10
            }
          },
          {
            "label": "A rough day, but survivable",
            "score": {
              "protection": 5,
              "fear": 5
            }
          },
          {
            "label": "It would be genuinely damaging",
            "score": {
              "protection": 0,
              "fear": 0
            }
          }
        ]
      },
      {
        "text": "Have you ever quietly worried that a competitor or ex-employee could access something they shouldn’t?",
        "options": [
          {
            "label": "No, access is tightly controlled",
            "score": {
              "protection": 10
            }
          },
          {
            "label": "Occasionally, in the back of my mind",
            "score": {
              "protection": 5
            }
          },
          {
            "label": "Yes, it’s a real concern",
            "score": {
              "protection": 0
            }
          }
        ]
      },
      {
        "text": "Do you have a documented plan for what to do the moment a breach is discovered?",
        "options": [
          {
            "label": "Yes, documented and tested",
            "score": {
              "protection": 10,
              "awareness": 10
            }
          },
          {
            "label": "Informal plan only",
            "score": {
              "protection": 5,
              "awareness": 5
            }
          },
          {
            "label": "No plan",
            "score": {
              "protection": 0,
              "awareness": 0
            }
          }
        ]
      },
      {
        "text": "If a client asked how secure their data is with you, how would you actually feel answering?",
        "options": [
          {
            "label": "Confident, I could explain it clearly",
            "score": {
              "fear": 10,
              "awareness": 10
            }
          },
          {
            "label": "A bit uneasy, I’d keep it vague",
            "score": {
              "fear": 5,
              "awareness": 5
            }
          },
          {
            "label": "I’d dread that question",
            "score": {
              "fear": 0,
              "awareness": 0
            }
          }
        ]
      },
      {
        "text": "What’s stopped you from taking security more seriously up to this point?",
        "options": [
          {
            "label": "Nothing, we already invest in it",
            "score": {
              "protection": 10,
              "fear": 10
            }
          },
          {
            "label": "Hasn’t felt urgent yet",
            "score": {
              "protection": 5,
              "fear": 5
            }
          },
          {
            "label": "Didn’t know where to start, or the cost worried me",
            "score": {
              "protection": 0,
              "fear": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Well protected"
      },
      {
        "min": 40,
        "label": "Exposed"
      },
      {
        "min": 0,
        "label": "High risk"
      }
    ],
    "ctaLabel": "Get a free security audit",
    "sortOrder": 6
  },
  {
    "slug": "do-you-need-a-managed-it-provider",
    "title": "Do You Need a Managed IT Provider?",
    "description": "Qualify SMEs who are outgrowing in-house IT support.",
    "filterCategory": "it",
    "coverImage": "/covers/do-you-need-a-managed-it-provider.svg",
    "intro": "Answer honestly — this is about what actually happens when things break, not a sales pitch.",
    "categories": [
      {
        "key": "capacity",
        "label": "IT capacity"
      },
      {
        "key": "risk",
        "label": "Downtime risk"
      },
      {
        "key": "frustration",
        "label": "Team frustration"
      }
    ],
    "questions": [
      {
        "text": "When something breaks, what’s the actual scramble that happens?",
        "options": [
          {
            "label": "No scramble — someone handles it fast",
            "score": {
              "capacity": 10,
              "frustration": 10
            }
          },
          {
            "label": "A bit of chaos, but we figure it out",
            "score": {
              "capacity": 5,
              "frustration": 5
            }
          },
          {
            "label": "Genuine panic and lost time",
            "score": {
              "capacity": 0,
              "frustration": 0
            }
          }
        ]
      },
      {
        "text": "How is IT actually handled at your business day to day?",
        "options": [
          {
            "label": "A dedicated in-house team",
            "score": {
              "capacity": 10
            }
          },
          {
            "label": "One person doing it part-time, alongside other work",
            "score": {
              "capacity": 5
            }
          },
          {
            "label": "Whoever’s free at the time",
            "score": {
              "capacity": 0
            }
          }
        ]
      },
      {
        "text": "Has your team ever complained, even jokingly, about IT being a headache?",
        "options": [
          {
            "label": "No, it runs smoothly",
            "score": {
              "frustration": 10
            }
          },
          {
            "label": "Occasionally",
            "score": {
              "frustration": 5
            }
          },
          {
            "label": "Yes, often",
            "score": {
              "frustration": 0
            }
          }
        ]
      },
      {
        "text": "How often do tech issues quietly eat into your team’s actual productive time?",
        "options": [
          {
            "label": "Rarely, it’s a non-issue",
            "score": {
              "risk": 10
            }
          },
          {
            "label": "Sometimes, a few times a month",
            "score": {
              "risk": 5
            }
          },
          {
            "label": "Often, it’s a constant drag",
            "score": {
              "risk": 0
            }
          }
        ]
      },
      {
        "text": "If your main system went down right now, who would even know what to do?",
        "options": [
          {
            "label": "Someone specific, immediately",
            "score": {
              "capacity": 10,
              "risk": 10
            }
          },
          {
            "label": "We’d figure it out eventually",
            "score": {
              "capacity": 5,
              "risk": 5
            }
          },
          {
            "label": "Honestly, nobody",
            "score": {
              "capacity": 0,
              "risk": 0
            }
          }
        ]
      },
      {
        "text": "Have you ever felt genuinely anxious waiting for a critical system to come back online?",
        "options": [
          {
            "label": "No, that hasn’t happened",
            "score": {
              "frustration": 10,
              "risk": 10
            }
          },
          {
            "label": "A little, briefly",
            "score": {
              "frustration": 5,
              "risk": 5
            }
          },
          {
            "label": "Yes, it was stressful",
            "score": {
              "frustration": 0,
              "risk": 0
            }
          }
        ]
      },
      {
        "text": "Do you have 24/7 monitoring on the systems that actually matter most?",
        "options": [
          {
            "label": "Yes",
            "score": {
              "capacity": 10,
              "risk": 10
            }
          },
          {
            "label": "Partial coverage",
            "score": {
              "capacity": 5,
              "risk": 5
            }
          },
          {
            "label": "No",
            "score": {
              "capacity": 0,
              "risk": 0
            }
          }
        ]
      },
      {
        "text": "What’s the real reason IT hasn’t been prioritized before now?",
        "options": [
          {
            "label": "It hasn’t needed to be — things run well",
            "score": {
              "capacity": 10,
              "frustration": 10
            }
          },
          {
            "label": "Other things kept taking priority",
            "score": {
              "capacity": 5,
              "frustration": 5
            }
          },
          {
            "label": "Not sure who to trust with it",
            "score": {
              "capacity": 0,
              "frustration": 0
            }
          }
        ]
      },
      {
        "text": "What would it actually feel like to stop worrying about this entirely?",
        "options": [
          {
            "label": "A real relief, honestly",
            "score": {
              "risk": 10,
              "frustration": 10
            }
          },
          {
            "label": "Nice, but not urgent for us",
            "score": {
              "risk": 5,
              "frustration": 5
            }
          },
          {
            "label": "We don’t really think about it that way",
            "score": {
              "risk": 0,
              "frustration": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Well covered"
      },
      {
        "min": 40,
        "label": "Stretched thin"
      },
      {
        "min": 0,
        "label": "At real risk"
      }
    ],
    "ctaLabel": "Talk to our team",
    "sortOrder": 7
  },
  {
    "slug": "could-your-business-survive-an-it-outage",
    "title": "Could Your Business Survive an IT Outage?",
    "description": "A readiness test that surfaces real, sellable gaps.",
    "filterCategory": "it",
    "coverImage": "/covers/could-your-business-survive-an-it-outage.svg",
    "intro": "A gut-check on what would actually happen if the worst-case scenario hit today.",
    "categories": [
      {
        "key": "backup",
        "label": "Backup & recovery"
      },
      {
        "key": "continuity",
        "label": "Continuity planning"
      },
      {
        "key": "dread",
        "label": "Outage dread"
      }
    ],
    "questions": [
      {
        "text": "If your systems vanished right now, what’s the honest first feeling?",
        "options": [
          {
            "label": "Mild annoyance — we’d recover fast",
            "score": {
              "continuity": 10,
              "dread": 10
            }
          },
          {
            "label": "Stress, but we’d manage",
            "score": {
              "continuity": 5,
              "dread": 5
            }
          },
          {
            "label": "Real panic",
            "score": {
              "continuity": 0,
              "dread": 0
            }
          }
        ]
      },
      {
        "text": "How often is your business data actually backed up, not just \"supposed to be\"?",
        "options": [
          {
            "label": "Automatically, daily",
            "score": {
              "backup": 10
            }
          },
          {
            "label": "Manually, and occasionally",
            "score": {
              "backup": 5
            }
          },
          {
            "label": "Not sure, or rarely",
            "score": {
              "backup": 0
            }
          }
        ]
      },
      {
        "text": "Has data ever gone missing and made your stomach drop?",
        "options": [
          {
            "label": "No, never happened",
            "score": {
              "dread": 10,
              "backup": 10
            }
          },
          {
            "label": "A small scare once",
            "score": {
              "dread": 5,
              "backup": 5
            }
          },
          {
            "label": "Yes, and it was awful",
            "score": {
              "dread": 0,
              "backup": 0
            }
          }
        ]
      },
      {
        "text": "If your systems went down right now, how long could you actually keep operating?",
        "options": [
          {
            "label": "Business as usual",
            "score": {
              "continuity": 10
            }
          },
          {
            "label": "A few hours, then real trouble",
            "score": {
              "continuity": 5
            }
          },
          {
            "label": "We’d be stuck immediately",
            "score": {
              "continuity": 0
            }
          }
        ]
      },
      {
        "text": "Who would even know what to do in the first ten minutes of an outage?",
        "options": [
          {
            "label": "Someone specific, with a clear plan",
            "score": {
              "continuity": 10,
              "backup": 10
            }
          },
          {
            "label": "We’d work it out as we go",
            "score": {
              "continuity": 5,
              "backup": 5
            }
          },
          {
            "label": "Honestly, chaos",
            "score": {
              "continuity": 0,
              "backup": 0
            }
          }
        ]
      },
      {
        "text": "Have you ever lost sleep, even briefly, worrying about \"what if the system just dies\"?",
        "options": [
          {
            "label": "No, I don’t think about it",
            "score": {
              "dread": 10
            }
          },
          {
            "label": "Occasionally, in the back of my mind",
            "score": {
              "dread": 5
            }
          },
          {
            "label": "Yes, more than I’d like to admit",
            "score": {
              "dread": 0
            }
          }
        ]
      },
      {
        "text": "Do you have a written disaster recovery plan, or just a mental one?",
        "options": [
          {
            "label": "Yes, written and tested",
            "score": {
              "backup": 10,
              "continuity": 10
            }
          },
          {
            "label": "Informal only",
            "score": {
              "backup": 5,
              "continuity": 5
            }
          },
          {
            "label": "No plan at all",
            "score": {
              "backup": 0,
              "continuity": 0
            }
          }
        ]
      },
      {
        "text": "What would an outage actually cost you — not just money, but reputation with clients?",
        "options": [
          {
            "label": "Minimal, we’d recover trust quickly",
            "score": {
              "dread": 10,
              "continuity": 10
            }
          },
          {
            "label": "Some damage, but repairable",
            "score": {
              "dread": 5,
              "continuity": 5
            }
          },
          {
            "label": "Serious, lasting damage",
            "score": {
              "dread": 0,
              "continuity": 0
            }
          }
        ]
      },
      {
        "text": "When did you last actually test whether your backups even work?",
        "options": [
          {
            "label": "Recently, and they worked",
            "score": {
              "backup": 10,
              "dread": 10
            }
          },
          {
            "label": "A while ago",
            "score": {
              "backup": 5,
              "dread": 5
            }
          },
          {
            "label": "Never tested them",
            "score": {
              "backup": 0,
              "dread": 0
            }
          }
        ]
      },
      {
        "text": "What’s the real reason a proper continuity plan hasn’t been put in place yet?",
        "options": [
          {
            "label": "It already has been",
            "score": {
              "continuity": 10,
              "backup": 10
            }
          },
          {
            "label": "Kept getting deprioritized",
            "score": {
              "continuity": 5,
              "backup": 5
            }
          },
          {
            "label": "Didn’t think it would happen to us",
            "score": {
              "continuity": 0,
              "backup": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Outage-ready"
      },
      {
        "min": 40,
        "label": "Some exposure"
      },
      {
        "min": 0,
        "label": "High risk"
      }
    ],
    "ctaLabel": "Get a free readiness check",
    "sortOrder": 8
  },
  {
    "slug": "the-entrepreneur-skills-test",
    "title": "The Entrepreneur Skills Test",
    "description": "Benchmark a founder's strengths before a strategy call.",
    "filterCategory": "coaching",
    "coverImage": "/covers/the-entrepreneur-skills-test.svg",
    "intro": "An honest benchmark of where you really stand as a founder right now.",
    "categories": [
      {
        "key": "execution",
        "label": "Execution"
      },
      {
        "key": "strategy",
        "label": "Strategic clarity"
      },
      {
        "key": "doubt",
        "label": "Self-doubt"
      }
    ],
    "questions": [
      {
        "text": "What’s the thought that creeps in when things aren’t going to plan?",
        "options": [
          {
            "label": "\"I’ll figure this out, I always do\"",
            "score": {
              "doubt": 10
            }
          },
          {
            "label": "\"Maybe I’m not cut out for this\"",
            "score": {
              "doubt": 5
            }
          },
          {
            "label": "\"I clearly don’t know what I’m doing\"",
            "score": {
              "doubt": 0
            }
          }
        ]
      },
      {
        "text": "How clear is your actual 12-month plan, if someone asked you to explain it right now?",
        "options": [
          {
            "label": "Very clear, I could explain it in a minute",
            "score": {
              "strategy": 10
            }
          },
          {
            "label": "Roughly clear, some fuzzy parts",
            "score": {
              "strategy": 5
            }
          },
          {
            "label": "Honestly, I’d struggle to explain it",
            "score": {
              "strategy": 0
            }
          }
        ]
      },
      {
        "text": "When was the last time you set a goal and actually hit it on time?",
        "options": [
          {
            "label": "Recently, consistently",
            "score": {
              "execution": 10
            }
          },
          {
            "label": "A while ago",
            "score": {
              "execution": 5
            }
          },
          {
            "label": "I can’t remember one",
            "score": {
              "execution": 0
            }
          }
        ]
      },
      {
        "text": "Do you have someone who actually holds you accountable, or just yourself?",
        "options": [
          {
            "label": "Yes, someone real",
            "score": {
              "execution": 10,
              "strategy": 10
            }
          },
          {
            "label": "Informally, sort of",
            "score": {
              "execution": 5,
              "strategy": 5
            }
          },
          {
            "label": "No, it’s just me",
            "score": {
              "execution": 0,
              "strategy": 0
            }
          }
        ]
      },
      {
        "text": "What’s the thing you keep telling yourself you’ll \"get to eventually\"?",
        "options": [
          {
            "label": "Nothing really, I stay on top of things",
            "score": {
              "execution": 10,
              "doubt": 10
            }
          },
          {
            "label": "A few things, but nothing critical",
            "score": {
              "execution": 5,
              "doubt": 5
            }
          },
          {
            "label": "Something important, and it’s been a while",
            "score": {
              "execution": 0,
              "doubt": 0
            }
          }
        ]
      },
      {
        "text": "Have you ever felt like an impostor running your own business?",
        "options": [
          {
            "label": "Rarely, I trust my judgment",
            "score": {
              "doubt": 10
            }
          },
          {
            "label": "Sometimes, in quiet moments",
            "score": {
              "doubt": 5
            }
          },
          {
            "label": "Often, honestly",
            "score": {
              "doubt": 0
            }
          }
        ]
      },
      {
        "text": "When you compare where you are to where you thought you’d be by now, how does that feel?",
        "options": [
          {
            "label": "Good, mostly on track",
            "score": {
              "strategy": 10,
              "doubt": 10
            }
          },
          {
            "label": "Mixed, some wins and some gaps",
            "score": {
              "strategy": 5,
              "doubt": 5
            }
          },
          {
            "label": "Frustrating, honestly behind",
            "score": {
              "strategy": 0,
              "doubt": 0
            }
          }
        ]
      },
      {
        "text": "What happens in your head right before a big decision?",
        "options": [
          {
            "label": "Clarity — I trust myself to decide",
            "score": {
              "execution": 10,
              "strategy": 10
            }
          },
          {
            "label": "Some second-guessing, but I move anyway",
            "score": {
              "execution": 5,
              "strategy": 5
            }
          },
          {
            "label": "I freeze or delay for too long",
            "score": {
              "execution": 0,
              "strategy": 0
            }
          }
        ]
      },
      {
        "text": "Has anyone close to you questioned whether this business is really working out?",
        "options": [
          {
            "label": "No, and I wouldn’t worry if they did",
            "score": {
              "doubt": 10
            }
          },
          {
            "label": "Once, and it stung a little",
            "score": {
              "doubt": 5
            }
          },
          {
            "label": "Yes, and it’s hard to shake off",
            "score": {
              "doubt": 0
            }
          }
        ]
      },
      {
        "text": "How consistently do you actually finish what you start?",
        "options": [
          {
            "label": "Consistently",
            "score": {
              "execution": 10
            }
          },
          {
            "label": "Sometimes",
            "score": {
              "execution": 5
            }
          },
          {
            "label": "Rarely",
            "score": {
              "execution": 0
            }
          }
        ]
      },
      {
        "text": "What would it feel like to finally have real clarity on your next 12 months?",
        "options": [
          {
            "label": "I already have that clarity",
            "score": {
              "strategy": 10,
              "doubt": 10
            }
          },
          {
            "label": "A relief — I could use it",
            "score": {
              "strategy": 5,
              "doubt": 5
            }
          },
          {
            "label": "Honestly, hard to imagine",
            "score": {
              "strategy": 0,
              "doubt": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Strong foundation"
      },
      {
        "min": 40,
        "label": "Building momentum"
      },
      {
        "min": 0,
        "label": "Early stage"
      }
    ],
    "ctaLabel": "Book a strategy call",
    "sortOrder": 9
  },
  {
    "slug": "1-2-1-strategy-session",
    "title": "1-2-1 Strategy Session",
    "description": "Invite qualified leads to book a tailored consultation.",
    "filterCategory": "coaching",
    "coverImage": "/covers/1-2-1-strategy-session.svg",
    "intro": "A few honest questions so this conversation actually gets to the heart of it.",
    "categories": [
      {
        "key": "urgency",
        "label": "Urgency"
      },
      {
        "key": "budget",
        "label": "Investment readiness"
      },
      {
        "key": "stuck",
        "label": "Feeling stuck"
      }
    ],
    "questions": [
      {
        "text": "What’s the one thing that, if it stays unsolved, will still be bothering you a year from now?",
        "options": [
          {
            "label": "Something specific I can name right now",
            "score": {
              "stuck": 10,
              "urgency": 10
            }
          },
          {
            "label": "A general sense that something needs to change",
            "score": {
              "stuck": 5,
              "urgency": 5
            }
          },
          {
            "label": "Nothing urgent, just exploring",
            "score": {
              "stuck": 0,
              "urgency": 0
            }
          }
        ]
      },
      {
        "text": "How does it feel right now, trying to solve this on your own?",
        "options": [
          {
            "label": "Fine, I just want a second opinion",
            "score": {
              "stuck": 10
            }
          },
          {
            "label": "Frustrating at times",
            "score": {
              "stuck": 5
            }
          },
          {
            "label": "Exhausting — I feel stuck",
            "score": {
              "stuck": 0
            }
          }
        ]
      },
      {
        "text": "How soon do you actually want to see this change?",
        "options": [
          {
            "label": "Immediately, I’m done waiting",
            "score": {
              "urgency": 10
            }
          },
          {
            "label": "Within a few months",
            "score": {
              "urgency": 5
            }
          },
          {
            "label": "No real rush",
            "score": {
              "urgency": 0
            }
          }
        ]
      },
      {
        "text": "Have you tried to work through this before, and what happened?",
        "options": [
          {
            "label": "Yes, and I made real progress",
            "score": {
              "budget": 10,
              "stuck": 10
            }
          },
          {
            "label": "Tried a bit, didn’t stick",
            "score": {
              "budget": 5,
              "stuck": 5
            }
          },
          {
            "label": "No, this is new territory",
            "score": {
              "budget": 0,
              "stuck": 0
            }
          }
        ]
      },
      {
        "text": "Have you invested in coaching or consulting before?",
        "options": [
          {
            "label": "Yes",
            "score": {
              "budget": 10
            }
          },
          {
            "label": "Considered it",
            "score": {
              "budget": 5
            }
          },
          {
            "label": "Never",
            "score": {
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "What would actually change in your life if this got sorted?",
        "options": [
          {
            "label": "Something significant — I think about this often",
            "score": {
              "urgency": 10,
              "stuck": 10
            }
          },
          {
            "label": "It would help, but I’d survive without it",
            "score": {
              "urgency": 5,
              "stuck": 5
            }
          },
          {
            "label": "Not much would change day to day",
            "score": {
              "urgency": 0,
              "stuck": 0
            }
          }
        ]
      },
      {
        "text": "Are you the one who ultimately decides whether to move forward on something like this?",
        "options": [
          {
            "label": "Yes",
            "score": {
              "urgency": 10,
              "budget": 10
            }
          },
          {
            "label": "I share the decision with someone",
            "score": {
              "urgency": 5,
              "budget": 5
            }
          },
          {
            "label": "No",
            "score": {
              "urgency": 0,
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "What’s stopped you from getting outside help with this before now?",
        "options": [
          {
            "label": "Nothing, I just hadn’t found the right person",
            "score": {
              "budget": 10,
              "stuck": 10
            }
          },
          {
            "label": "Timing or cost",
            "score": {
              "budget": 5,
              "stuck": 5
            }
          },
          {
            "label": "I wasn’t sure it would actually help",
            "score": {
              "budget": 0,
              "stuck": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Ready now"
      },
      {
        "min": 40,
        "label": "Worth a conversation"
      },
      {
        "min": 0,
        "label": "Not yet"
      }
    ],
    "ctaLabel": "Book your session",
    "sortOrder": 10
  },
  {
    "slug": "business-growth-readiness-scorecard",
    "title": "Business Growth Readiness Scorecard",
    "description": "Score how ready a business is to scale, and what's holding it back.",
    "filterCategory": "coaching",
    "coverImage": "/covers/business-growth-readiness-scorecard.svg",
    "intro": "An honest look at what’s actually holding your business back from the next level.",
    "categories": [
      {
        "key": "systems",
        "label": "Systems & process"
      },
      {
        "key": "capacity",
        "label": "Team capacity"
      },
      {
        "key": "friction",
        "label": "Growth friction"
      }
    ],
    "questions": [
      {
        "text": "What’s the thing that breaks first whenever business picks up unexpectedly?",
        "options": [
          {
            "label": "Nothing really, we absorb it fine",
            "score": {
              "systems": 10,
              "capacity": 10
            }
          },
          {
            "label": "A specific process gets messy",
            "score": {
              "systems": 5,
              "capacity": 5
            }
          },
          {
            "label": "Everything — it feels chaotic fast",
            "score": {
              "systems": 0,
              "capacity": 0
            }
          }
        ]
      },
      {
        "text": "If you took two weeks off completely unreachable, what would actually happen?",
        "options": [
          {
            "label": "The business would run just fine",
            "score": {
              "systems": 10,
              "friction": 10
            }
          },
          {
            "label": "A few fires, but it would survive",
            "score": {
              "systems": 5,
              "friction": 5
            }
          },
          {
            "label": "It would probably fall apart",
            "score": {
              "systems": 0,
              "friction": 0
            }
          }
        ]
      },
      {
        "text": "Are your core processes actually documented, or just in people’s heads?",
        "options": [
          {
            "label": "Yes, fully documented",
            "score": {
              "systems": 10
            }
          },
          {
            "label": "Partially",
            "score": {
              "systems": 5
            }
          },
          {
            "label": "Mostly in people’s heads",
            "score": {
              "systems": 0
            }
          }
        ]
      },
      {
        "text": "What’s the recurring frustration that keeps showing up week after week?",
        "options": [
          {
            "label": "Nothing recurring, honestly",
            "score": {
              "friction": 10
            }
          },
          {
            "label": "A minor annoyance I’ve learned to live with",
            "score": {
              "friction": 5
            }
          },
          {
            "label": "Something that genuinely drains me",
            "score": {
              "friction": 0
            }
          }
        ]
      },
      {
        "text": "Could your current team handle twice the demand without everyone burning out?",
        "options": [
          {
            "label": "Yes, comfortably",
            "score": {
              "capacity": 10
            }
          },
          {
            "label": "With some strain",
            "score": {
              "capacity": 5
            }
          },
          {
            "label": "No, we’re already stretched",
            "score": {
              "capacity": 0
            }
          }
        ]
      },
      {
        "text": "Have you ever turned down an opportunity because you simply couldn’t handle it?",
        "options": [
          {
            "label": "No, never had to",
            "score": {
              "capacity": 10,
              "friction": 10
            }
          },
          {
            "label": "Once or twice",
            "score": {
              "capacity": 5,
              "friction": 5
            }
          },
          {
            "label": "Yes, more than I’d like to admit",
            "score": {
              "capacity": 0,
              "friction": 0
            }
          }
        ]
      },
      {
        "text": "What does a genuinely bad week in this business actually look like right now?",
        "options": [
          {
            "label": "Rare, and manageable when it happens",
            "score": {
              "friction": 10,
              "systems": 10
            }
          },
          {
            "label": "Stressful, but we push through",
            "score": {
              "friction": 5,
              "systems": 5
            }
          },
          {
            "label": "Honestly overwhelming",
            "score": {
              "friction": 0,
              "systems": 0
            }
          }
        ]
      },
      {
        "text": "Do you have a written growth plan for the next 12 months?",
        "options": [
          {
            "label": "Yes",
            "score": {
              "systems": 10,
              "capacity": 10
            }
          },
          {
            "label": "Rough idea only",
            "score": {
              "systems": 5,
              "capacity": 5
            }
          },
          {
            "label": "No",
            "score": {
              "systems": 0,
              "capacity": 0
            }
          }
        ]
      },
      {
        "text": "When you think about scaling up, what’s the honest emotion that comes up?",
        "options": [
          {
            "label": "Excitement — I feel ready",
            "score": {
              "friction": 10,
              "capacity": 10
            }
          },
          {
            "label": "Cautious optimism",
            "score": {
              "friction": 5,
              "capacity": 5
            }
          },
          {
            "label": "Dread, if I’m honest",
            "score": {
              "friction": 0,
              "capacity": 0
            }
          }
        ]
      },
      {
        "text": "Has a key team member ever left and taken critical knowledge with them?",
        "options": [
          {
            "label": "No, knowledge is well documented",
            "score": {
              "systems": 10
            }
          },
          {
            "label": "Once, and it hurt a bit",
            "score": {
              "systems": 5
            }
          },
          {
            "label": "Yes, and it set us back badly",
            "score": {
              "systems": 0
            }
          }
        ]
      },
      {
        "text": "How do you feel about delegating important decisions to your team?",
        "options": [
          {
            "label": "Comfortable, I trust the process",
            "score": {
              "capacity": 10,
              "systems": 10
            }
          },
          {
            "label": "I try, but I still double-check a lot",
            "score": {
              "capacity": 5,
              "systems": 5
            }
          },
          {
            "label": "I struggle to let go",
            "score": {
              "capacity": 0,
              "systems": 0
            }
          }
        ]
      },
      {
        "text": "What’s the real reason growth has stalled, if you’re honest with yourself?",
        "options": [
          {
            "label": "It hasn’t — we’re growing steadily",
            "score": {
              "friction": 10,
              "systems": 10
            }
          },
          {
            "label": "A specific bottleneck I know about",
            "score": {
              "friction": 5,
              "systems": 5
            }
          },
          {
            "label": "Honestly not sure — it just feels stuck",
            "score": {
              "friction": 0,
              "systems": 0
            }
          }
        ]
      },
      {
        "text": "How often do you personally still have to step in to fix something that should run itself?",
        "options": [
          {
            "label": "Rarely",
            "score": {
              "systems": 10,
              "capacity": 10
            }
          },
          {
            "label": "Weekly",
            "score": {
              "systems": 5,
              "capacity": 5
            }
          },
          {
            "label": "Daily, it feels like",
            "score": {
              "systems": 0,
              "capacity": 0
            }
          }
        ]
      },
      {
        "text": "What would it mean for you personally if this business finally ran without you in every corner of it?",
        "options": [
          {
            "label": "That’s already close to true",
            "score": {
              "friction": 10,
              "capacity": 10
            }
          },
          {
            "label": "It would be a huge relief",
            "score": {
              "friction": 5,
              "capacity": 5
            }
          },
          {
            "label": "Honestly hard to imagine right now",
            "score": {
              "friction": 0,
              "capacity": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Scale-ready"
      },
      {
        "min": 40,
        "label": "Getting there"
      },
      {
        "min": 0,
        "label": "Not yet ready"
      }
    ],
    "ctaLabel": "Book a growth consultation",
    "sortOrder": 11
  },
  {
    "slug": "candidate-pre-screening-assessment",
    "title": "Candidate Pre-Screening Assessment",
    "description": "Filter applicants before your team spends time on interviews.",
    "filterCategory": "hr",
    "coverImage": "/covers/candidate-pre-screening-assessment.svg",
    "intro": "A few honest questions about where you actually are in your career search.",
    "categories": [
      {
        "key": "experience",
        "label": "Relevant experience"
      },
      {
        "key": "availability",
        "label": "Availability"
      },
      {
        "key": "motivation",
        "label": "Motivation"
      }
    ],
    "questions": [
      {
        "text": "What’s actually making you look for something new right now?",
        "options": [
          {
            "label": "I’m genuinely unhappy where I am",
            "score": {
              "motivation": 10
            }
          },
          {
            "label": "Open to something better if it comes along",
            "score": {
              "motivation": 5
            }
          },
          {
            "label": "Just curious what’s out there",
            "score": {
              "motivation": 0
            }
          }
        ]
      },
      {
        "text": "How many years of relevant experience do you actually have?",
        "options": [
          {
            "label": "5+ years",
            "score": {
              "experience": 10
            }
          },
          {
            "label": "1–4 years",
            "score": {
              "experience": 5
            }
          },
          {
            "label": "Less than a year",
            "score": {
              "experience": 0
            }
          }
        ]
      },
      {
        "text": "What’s the real reason you haven’t made a move sooner?",
        "options": [
          {
            "label": "Just waiting for the right opportunity",
            "score": {
              "motivation": 10,
              "availability": 10
            }
          },
          {
            "label": "Been busy, hasn’t been a priority",
            "score": {
              "motivation": 5,
              "availability": 5
            }
          },
          {
            "label": "Nervous about starting over somewhere new",
            "score": {
              "motivation": 0,
              "availability": 0
            }
          }
        ]
      },
      {
        "text": "When could you realistically start, if offered the role today?",
        "options": [
          {
            "label": "Immediately",
            "score": {
              "availability": 10
            }
          },
          {
            "label": "Within a month",
            "score": {
              "availability": 5
            }
          },
          {
            "label": "More than a month",
            "score": {
              "availability": 0
            }
          }
        ]
      },
      {
        "text": "Have you worked in this specific industry before?",
        "options": [
          {
            "label": "Yes",
            "score": {
              "experience": 10,
              "availability": 10
            }
          },
          {
            "label": "A related one",
            "score": {
              "experience": 5,
              "availability": 5
            }
          },
          {
            "label": "No",
            "score": {
              "experience": 0,
              "availability": 0
            }
          }
        ]
      },
      {
        "text": "What would actually make you say yes to a job offer right now?",
        "options": [
          {
            "label": "The role and growth path being right",
            "score": {
              "motivation": 10
            }
          },
          {
            "label": "Salary and the role both mattering",
            "score": {
              "motivation": 5
            }
          },
          {
            "label": "Honestly, just needing the income",
            "score": {
              "motivation": 0
            }
          }
        ]
      },
      {
        "text": "Has your current situation ever left you feeling stuck or undervalued?",
        "options": [
          {
            "label": "Yes, that’s exactly why I’m looking",
            "score": {
              "motivation": 10,
              "experience": 5
            }
          },
          {
            "label": "Somewhat, not a big driver",
            "score": {
              "motivation": 5,
              "experience": 5
            }
          },
          {
            "label": "Not really, I’m just exploring",
            "score": {
              "motivation": 0,
              "experience": 0
            }
          }
        ]
      },
      {
        "text": "What’s the skill or experience you feel most confident bringing to a new role?",
        "options": [
          {
            "label": "Something I’ve mastered over years",
            "score": {
              "experience": 10
            }
          },
          {
            "label": "Something I’m still building up",
            "score": {
              "experience": 5
            }
          },
          {
            "label": "Honestly, still figuring that out",
            "score": {
              "experience": 0
            }
          }
        ]
      },
      {
        "text": "If this application went nowhere, what would you actually do next?",
        "options": [
          {
            "label": "Keep applying seriously until something lands",
            "score": {
              "motivation": 10,
              "availability": 10
            }
          },
          {
            "label": "Take a break and try again later",
            "score": {
              "motivation": 5,
              "availability": 5
            }
          },
          {
            "label": "Probably stay where I am",
            "score": {
              "motivation": 0,
              "availability": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Strong match"
      },
      {
        "min": 40,
        "label": "Worth a look"
      },
      {
        "min": 0,
        "label": "Not a fit yet"
      }
    ],
    "ctaLabel": "Schedule an interview",
    "sortOrder": 12
  },
  {
    "slug": "talent-fit-check-assessment",
    "title": "Talent Fit Check Assessment",
    "description": "Score client-role fit before you commit to a search.",
    "filterCategory": "hr",
    "coverImage": "/covers/talent-fit-check-assessment.svg",
    "intro": "A few honest questions about what’s actually going on with this hire.",
    "categories": [
      {
        "key": "clarity",
        "label": "Role clarity"
      },
      {
        "key": "urgency",
        "label": "Hiring urgency"
      },
      {
        "key": "pain",
        "label": "Hiring pain"
      }
    ],
    "questions": [
      {
        "text": "What’s actually happening because this seat is empty right now?",
        "options": [
          {
            "label": "Real strain — things are falling through",
            "score": {
              "pain": 10,
              "urgency": 10
            }
          },
          {
            "label": "Some inconvenience, we’re coping",
            "score": {
              "pain": 5,
              "urgency": 5
            }
          },
          {
            "label": "Not much, we’re planning ahead",
            "score": {
              "pain": 0,
              "urgency": 0
            }
          }
        ]
      },
      {
        "text": "How clearly defined is the role you’re actually hiring for?",
        "options": [
          {
            "label": "Very clear, job spec ready",
            "score": {
              "clarity": 10
            }
          },
          {
            "label": "Rough idea",
            "score": {
              "clarity": 5
            }
          },
          {
            "label": "Still figuring it out",
            "score": {
              "clarity": 0
            }
          }
        ]
      },
      {
        "text": "Has a previous hire for a similar role ever gone badly wrong?",
        "options": [
          {
            "label": "No, hiring has gone smoothly",
            "score": {
              "pain": 10,
              "clarity": 10
            }
          },
          {
            "label": "Once, and it was a learning experience",
            "score": {
              "pain": 5,
              "clarity": 5
            }
          },
          {
            "label": "Yes, and it still stings",
            "score": {
              "pain": 0,
              "clarity": 0
            }
          }
        ]
      },
      {
        "text": "How soon does this role actually need to be filled?",
        "options": [
          {
            "label": "Within 30 days",
            "score": {
              "urgency": 10
            }
          },
          {
            "label": "1–3 months",
            "score": {
              "urgency": 5
            }
          },
          {
            "label": "No fixed timeline",
            "score": {
              "urgency": 0
            }
          }
        ]
      },
      {
        "text": "What’s the honest cost of leaving this position vacant another month?",
        "options": [
          {
            "label": "High — it’s actively hurting the business",
            "score": {
              "urgency": 10,
              "pain": 10
            }
          },
          {
            "label": "Moderate, manageable for now",
            "score": {
              "urgency": 5,
              "pain": 5
            }
          },
          {
            "label": "Low, no real pressure",
            "score": {
              "urgency": 0,
              "pain": 0
            }
          }
        ]
      },
      {
        "text": "Is there budget already approved for this hire?",
        "options": [
          {
            "label": "Yes",
            "score": {
              "clarity": 10,
              "urgency": 10
            }
          },
          {
            "label": "Pending approval",
            "score": {
              "clarity": 5,
              "urgency": 5
            }
          },
          {
            "label": "No",
            "score": {
              "clarity": 0,
              "urgency": 0
            }
          }
        ]
      },
      {
        "text": "What’s the real reason previous attempts to fill this role haven’t worked out?",
        "options": [
          {
            "label": "This is a fresh search, no prior attempts",
            "score": {
              "clarity": 10,
              "pain": 10
            }
          },
          {
            "label": "Couldn’t find the right fit yet",
            "score": {
              "clarity": 5,
              "pain": 5
            }
          },
          {
            "label": "Kept getting the wrong candidates",
            "score": {
              "clarity": 0,
              "pain": 0
            }
          }
        ]
      },
      {
        "text": "How does the team currently feel about this gap in headcount?",
        "options": [
          {
            "label": "Fine, no real pressure felt",
            "score": {
              "pain": 10
            }
          },
          {
            "label": "A bit stretched, noticeable",
            "score": {
              "pain": 5
            }
          },
          {
            "label": "Frustrated, it’s become a real issue",
            "score": {
              "pain": 0
            }
          }
        ]
      },
      {
        "text": "What would it mean for the business if this role stayed unfilled another quarter?",
        "options": [
          {
            "label": "Not much, we’d adapt fine",
            "score": {
              "urgency": 0,
              "pain": 0
            }
          },
          {
            "label": "Some missed opportunities",
            "score": {
              "urgency": 5,
              "pain": 5
            }
          },
          {
            "label": "A serious setback",
            "score": {
              "urgency": 10,
              "pain": 10
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Ready to search"
      },
      {
        "min": 40,
        "label": "Nearly ready"
      },
      {
        "min": 0,
        "label": "Not yet"
      }
    ],
    "ctaLabel": "Start a search",
    "sortOrder": 13
  },
  {
    "slug": "how-strong-is-your-company-culture",
    "title": "How Strong Is Your Company Culture?",
    "description": "An employer-branding lead magnet for HR consultancies.",
    "filterCategory": "hr",
    "coverImage": "/covers/how-strong-is-your-company-culture.svg",
    "intro": "An honest look at what it actually feels like to work at your company.",
    "categories": [
      {
        "key": "retention",
        "label": "Retention"
      },
      {
        "key": "engagement",
        "label": "Engagement"
      },
      {
        "key": "trust",
        "label": "Leadership trust"
      }
    ],
    "questions": [
      {
        "text": "If you overheard your team talking honestly about work over lunch, what would you hear?",
        "options": [
          {
            "label": "Mostly positive, genuine enthusiasm",
            "score": {
              "engagement": 10,
              "trust": 10
            }
          },
          {
            "label": "A mix of good and venting",
            "score": {
              "engagement": 5,
              "trust": 5
            }
          },
          {
            "label": "Mostly complaints, if I’m honest",
            "score": {
              "engagement": 0,
              "trust": 0
            }
          }
        ]
      },
      {
        "text": "How would you rate staff turnover in the last year, really?",
        "options": [
          {
            "label": "Low",
            "score": {
              "retention": 10
            }
          },
          {
            "label": "Moderate",
            "score": {
              "retention": 5
            }
          },
          {
            "label": "High",
            "score": {
              "retention": 0
            }
          }
        ]
      },
      {
        "text": "Has a good employee ever left and the exit interview stung to read?",
        "options": [
          {
            "label": "No, exits have been amicable",
            "score": {
              "retention": 10,
              "trust": 10
            }
          },
          {
            "label": "Once, and it made me reflect",
            "score": {
              "retention": 5,
              "trust": 5
            }
          },
          {
            "label": "Yes, more than once",
            "score": {
              "retention": 0,
              "trust": 0
            }
          }
        ]
      },
      {
        "text": "Do employees actually feel safe giving honest feedback about culture?",
        "options": [
          {
            "label": "Yes, regularly and openly",
            "score": {
              "engagement": 10,
              "trust": 10
            }
          },
          {
            "label": "Occasionally, if prompted",
            "score": {
              "engagement": 5,
              "trust": 5
            }
          },
          {
            "label": "Rarely, people tend to hold back",
            "score": {
              "engagement": 0,
              "trust": 0
            }
          }
        ]
      },
      {
        "text": "Would your team genuinely recommend working here to a close friend?",
        "options": [
          {
            "label": "Definitely",
            "score": {
              "retention": 10,
              "engagement": 10
            }
          },
          {
            "label": "Maybe",
            "score": {
              "retention": 5,
              "engagement": 5
            }
          },
          {
            "label": "Unlikely",
            "score": {
              "retention": 0,
              "engagement": 0
            }
          }
        ]
      },
      {
        "text": "What’s the last thing you did that visibly made someone on your team feel valued?",
        "options": [
          {
            "label": "Something recent, easy to recall",
            "score": {
              "trust": 10
            }
          },
          {
            "label": "It’s been a while",
            "score": {
              "trust": 5
            }
          },
          {
            "label": "Honestly can’t think of one",
            "score": {
              "trust": 0
            }
          }
        ]
      },
      {
        "text": "How do people on your team react when leadership makes a decision that affects them?",
        "options": [
          {
            "label": "Trust, even when they disagree",
            "score": {
              "trust": 10
            }
          },
          {
            "label": "Mixed reactions, some skepticism",
            "score": {
              "trust": 5
            }
          },
          {
            "label": "Frustration or quiet resentment",
            "score": {
              "trust": 0
            }
          }
        ]
      },
      {
        "text": "Has anyone ever quit and privately admitted it was about culture, not pay?",
        "options": [
          {
            "label": "No, that hasn’t come up",
            "score": {
              "retention": 10,
              "trust": 10
            }
          },
          {
            "label": "Maybe, it was never said directly",
            "score": {
              "retention": 5,
              "trust": 5
            }
          },
          {
            "label": "Yes, and it was hard to hear",
            "score": {
              "retention": 0,
              "trust": 0
            }
          }
        ]
      },
      {
        "text": "When was the last time someone on the team genuinely surprised you with their initiative?",
        "options": [
          {
            "label": "Recently, that happens often here",
            "score": {
              "engagement": 10
            }
          },
          {
            "label": "Occasionally",
            "score": {
              "engagement": 5
            }
          },
          {
            "label": "Honestly, rarely",
            "score": {
              "engagement": 0
            }
          }
        ]
      },
      {
        "text": "What would it mean for your business if the best people never wanted to leave?",
        "options": [
          {
            "label": "That’s already close to true for us",
            "score": {
              "retention": 10,
              "engagement": 10
            }
          },
          {
            "label": "It would be a real advantage",
            "score": {
              "retention": 5,
              "engagement": 5
            }
          },
          {
            "label": "Hard to imagine, we lose good people too often",
            "score": {
              "retention": 0,
              "engagement": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Strong culture"
      },
      {
        "min": 40,
        "label": "Room to grow"
      },
      {
        "min": 0,
        "label": "Needs work"
      }
    ],
    "ctaLabel": "Book a culture consultation",
    "sortOrder": 14
  },
  {
    "slug": "fitness-goals-assessment",
    "title": "Fitness Goals Assessment",
    "description": "Qualify serious clients from window-shoppers before a consult.",
    "filterCategory": "fitness",
    "coverImage": "/covers/fitness-goals-assessment.svg",
    "intro": "A few honest questions about how you actually feel in your body right now.",
    "categories": [
      {
        "key": "commitment",
        "label": "Commitment"
      },
      {
        "key": "clarity",
        "label": "Goal clarity"
      },
      {
        "key": "frustration",
        "label": "Body frustration"
      }
    ],
    "questions": [
      {
        "text": "What’s the moment that made you actually start thinking about this?",
        "options": [
          {
            "label": "Something specific — a photo, a comment, a health scare",
            "score": {
              "frustration": 10,
              "clarity": 5
            }
          },
          {
            "label": "A slow, building feeling of wanting change",
            "score": {
              "frustration": 5,
              "clarity": 5
            }
          },
          {
            "label": "Nothing specific, just curious",
            "score": {
              "frustration": 0,
              "clarity": 0
            }
          }
        ]
      },
      {
        "text": "How do you actually feel when you catch your reflection lately?",
        "options": [
          {
            "label": "Pretty good, mostly confident",
            "score": {
              "frustration": 10
            }
          },
          {
            "label": "Mixed feelings",
            "score": {
              "frustration": 5
            }
          },
          {
            "label": "Honestly, disappointed",
            "score": {
              "frustration": 0
            }
          }
        ]
      },
      {
        "text": "How many days a week can you realistically show up, not just on paper?",
        "options": [
          {
            "label": "4+ days",
            "score": {
              "commitment": 10
            }
          },
          {
            "label": "2–3 days",
            "score": {
              "commitment": 5
            }
          },
          {
            "label": "1 or fewer",
            "score": {
              "commitment": 0
            }
          }
        ]
      },
      {
        "text": "Have you tried to fix this on your own before, and what happened?",
        "options": [
          {
            "label": "Yes, and I made real progress",
            "score": {
              "commitment": 10,
              "clarity": 10
            }
          },
          {
            "label": "Started strong, then fell off",
            "score": {
              "commitment": 5,
              "clarity": 5
            }
          },
          {
            "label": "Never really committed to a plan",
            "score": {
              "commitment": 0,
              "clarity": 0
            }
          }
        ]
      },
      {
        "text": "What’s the honest goal — not the polite version you tell people?",
        "options": [
          {
            "label": "A specific, measurable outcome",
            "score": {
              "clarity": 10
            }
          },
          {
            "label": "Just generally feeling better",
            "score": {
              "clarity": 5
            }
          },
          {
            "label": "Not sure yet, still figuring it out",
            "score": {
              "clarity": 0
            }
          }
        ]
      },
      {
        "text": "Has your weight or fitness ever affected your confidence in a moment that mattered?",
        "options": [
          {
            "label": "No, it hasn’t really",
            "score": {
              "frustration": 10
            }
          },
          {
            "label": "A little, once or twice",
            "score": {
              "frustration": 5
            }
          },
          {
            "label": "Yes, and it stuck with me",
            "score": {
              "frustration": 0
            }
          }
        ]
      },
      {
        "text": "Have you worked with a trainer or coach before?",
        "options": [
          {
            "label": "Yes, and it worked well",
            "score": {
              "commitment": 10,
              "clarity": 10
            }
          },
          {
            "label": "Tried it briefly",
            "score": {
              "commitment": 5,
              "clarity": 5
            }
          },
          {
            "label": "Never",
            "score": {
              "commitment": 0,
              "clarity": 0
            }
          }
        ]
      },
      {
        "text": "What would actually change for you personally if you hit this goal?",
        "options": [
          {
            "label": "Something significant about how I feel or live",
            "score": {
              "clarity": 10,
              "frustration": 10
            }
          },
          {
            "label": "It would be nice, not life-changing",
            "score": {
              "clarity": 5,
              "frustration": 5
            }
          },
          {
            "label": "Not sure it would change much",
            "score": {
              "clarity": 0,
              "frustration": 0
            }
          }
        ]
      },
      {
        "text": "What’s stopped you from committing fully up to this point?",
        "options": [
          {
            "label": "Nothing, I’m ready to commit now",
            "score": {
              "commitment": 10,
              "frustration": 10
            }
          },
          {
            "label": "Time or energy, mostly",
            "score": {
              "commitment": 5,
              "frustration": 5
            }
          },
          {
            "label": "I keep starting and stopping",
            "score": {
              "commitment": 0,
              "frustration": 0
            }
          }
        ]
      },
      {
        "text": "How would it feel to finally stop thinking about this and just be in the body you want?",
        "options": [
          {
            "label": "That relief is exactly what I’m after",
            "score": {
              "frustration": 10,
              "clarity": 10
            }
          },
          {
            "label": "It would be nice",
            "score": {
              "frustration": 5,
              "clarity": 5
            }
          },
          {
            "label": "Haven’t thought about it that way",
            "score": {
              "frustration": 0,
              "clarity": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Ready to commit"
      },
      {
        "min": 40,
        "label": "Getting motivated"
      },
      {
        "min": 0,
        "label": "Just exploring"
      }
    ],
    "ctaLabel": "Book a free consult",
    "sortOrder": 15
  },
  {
    "slug": "the-personalised-nutrition-audit",
    "title": "The Personalised Nutrition Audit",
    "description": "A value-first quiz that leads naturally into a paid plan.",
    "filterCategory": "fitness",
    "coverImage": "/covers/the-personalised-nutrition-audit.svg",
    "intro": "A few honest questions about your actual relationship with food.",
    "categories": [
      {
        "key": "habits",
        "label": "Current habits"
      },
      {
        "key": "goals",
        "label": "Nutrition clarity"
      },
      {
        "key": "guilt",
        "label": "Food guilt"
      }
    ],
    "questions": [
      {
        "text": "What’s the honest feeling right after you eat something you \"shouldn’t have\"?",
        "options": [
          {
            "label": "Nothing much, I don’t stress about it",
            "score": {
              "guilt": 10
            }
          },
          {
            "label": "A little guilt, but I move on",
            "score": {
              "guilt": 5
            }
          },
          {
            "label": "Real guilt that sticks with me",
            "score": {
              "guilt": 0
            }
          }
        ]
      },
      {
        "text": "How would you honestly describe your eating on a normal day?",
        "options": [
          {
            "label": "Structured and consistent",
            "score": {
              "habits": 10
            }
          },
          {
            "label": "Mixed, some good days and some not",
            "score": {
              "habits": 5
            }
          },
          {
            "label": "Mostly unplanned",
            "score": {
              "habits": 0
            }
          }
        ]
      },
      {
        "text": "Has your eating ever made you cancel plans or avoid a photo?",
        "options": [
          {
            "label": "No, never",
            "score": {
              "guilt": 10,
              "habits": 5
            }
          },
          {
            "label": "Once or twice",
            "score": {
              "guilt": 5,
              "habits": 5
            }
          },
          {
            "label": "Yes, more than once",
            "score": {
              "guilt": 0,
              "habits": 0
            }
          }
        ]
      },
      {
        "text": "What’s the honest, specific goal — not the polite version?",
        "options": [
          {
            "label": "A clear, specific target",
            "score": {
              "goals": 10
            }
          },
          {
            "label": "General healthier eating",
            "score": {
              "goals": 5
            }
          },
          {
            "label": "Not sure, honestly",
            "score": {
              "goals": 0
            }
          }
        ]
      },
      {
        "text": "Have you tried diets or plans before that didn’t stick?",
        "options": [
          {
            "label": "A few, and I learned what works for me",
            "score": {
              "habits": 10,
              "goals": 10
            }
          },
          {
            "label": "One or two, with mixed results",
            "score": {
              "habits": 5,
              "goals": 5
            }
          },
          {
            "label": "Many, and nothing has stuck",
            "score": {
              "habits": 0,
              "goals": 0
            }
          }
        ]
      },
      {
        "text": "How do you feel about food when you’re stressed or tired?",
        "options": [
          {
            "label": "In control, it doesn’t change much",
            "score": {
              "guilt": 10,
              "habits": 10
            }
          },
          {
            "label": "I notice a pull, but manage it",
            "score": {
              "guilt": 5,
              "habits": 5
            }
          },
          {
            "label": "I lose control and regret it after",
            "score": {
              "guilt": 0,
              "habits": 0
            }
          }
        ]
      },
      {
        "text": "Have you tracked your food intake before?",
        "options": [
          {
            "label": "Yes, regularly",
            "score": {
              "habits": 10,
              "goals": 10
            }
          },
          {
            "label": "Occasionally",
            "score": {
              "habits": 5,
              "goals": 5
            }
          },
          {
            "label": "Never",
            "score": {
              "habits": 0,
              "goals": 0
            }
          }
        ]
      },
      {
        "text": "What’s the real reason past attempts at eating better haven’t lasted?",
        "options": [
          {
            "label": "They actually have — I just want to refine it",
            "score": {
              "habits": 10,
              "guilt": 10
            }
          },
          {
            "label": "Life got busy and it slipped",
            "score": {
              "habits": 5,
              "guilt": 5
            }
          },
          {
            "label": "I never had a plan that fit my life",
            "score": {
              "habits": 0,
              "guilt": 0
            }
          }
        ]
      },
      {
        "text": "What would it mean for you personally to finally feel at peace with food?",
        "options": [
          {
            "label": "That’s exactly what I’m looking for",
            "score": {
              "guilt": 10,
              "goals": 10
            }
          },
          {
            "label": "It would help, not the main thing",
            "score": {
              "guilt": 5,
              "goals": 5
            }
          },
          {
            "label": "Haven’t thought of it that way",
            "score": {
              "guilt": 0,
              "goals": 0
            }
          }
        ]
      },
      {
        "text": "When you imagine eating well without obsessing over it, how does that feel?",
        "options": [
          {
            "label": "That’s the goal — sustainable, not obsessive",
            "score": {
              "goals": 10,
              "guilt": 10
            }
          },
          {
            "label": "Sounds nice, hard to picture",
            "score": {
              "goals": 5,
              "guilt": 5
            }
          },
          {
            "label": "I don’t really think about it that way",
            "score": {
              "goals": 0,
              "guilt": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Dialled in"
      },
      {
        "min": 40,
        "label": "Making progress"
      },
      {
        "min": 0,
        "label": "Starting fresh"
      }
    ],
    "ctaLabel": "Get your personalised plan",
    "sortOrder": 16
  },
  {
    "slug": "the-which-pt-scorecard",
    "title": "The Which PT Scorecard",
    "description": "Match leads to the right trainer or programme automatically.",
    "filterCategory": "fitness",
    "coverImage": "/covers/the-which-pt-scorecard.svg",
    "intro": "A few honest questions to find the coach who’ll actually work for you.",
    "categories": [
      {
        "key": "style",
        "label": "Training style"
      },
      {
        "key": "schedule",
        "label": "Schedule fit"
      },
      {
        "key": "accountability",
        "label": "Accountability need"
      }
    ],
    "questions": [
      {
        "text": "Be honest — what usually makes you quit on a fitness plan?",
        "options": [
          {
            "label": "Nothing usually, I stick with things",
            "score": {
              "accountability": 10
            }
          },
          {
            "label": "Losing motivation after a few weeks",
            "score": {
              "accountability": 5
            }
          },
          {
            "label": "Nobody checking in, so I just fade out",
            "score": {
              "accountability": 0
            }
          }
        ]
      },
      {
        "text": "What kind of training actually excites you versus what you think you \"should\" do?",
        "options": [
          {
            "label": "High-intensity, structured challenge",
            "score": {
              "style": 10
            }
          },
          {
            "label": "Steady, moderate pace",
            "score": {
              "style": 5
            }
          },
          {
            "label": "Honestly not sure yet",
            "score": {
              "style": 0
            }
          }
        ]
      },
      {
        "text": "When you’ve fallen off a routine before, what was really going on?",
        "options": [
          {
            "label": "Life got busy, schedule didn’t fit",
            "score": {
              "schedule": 0
            }
          },
          {
            "label": "Lost interest in the style of training",
            "score": {
              "style": 0
            }
          },
          {
            "label": "I usually don’t fall off once I start",
            "score": {
              "schedule": 10,
              "style": 10
            }
          }
        ]
      },
      {
        "text": "When can you actually, realistically train — not the ideal answer?",
        "options": [
          {
            "label": "Flexible, any time",
            "score": {
              "schedule": 10
            }
          },
          {
            "label": "Mornings or evenings only",
            "score": {
              "schedule": 5
            }
          },
          {
            "label": "Honestly hard to say",
            "score": {
              "schedule": 0
            }
          }
        ]
      },
      {
        "text": "Do you push yourself harder alone, or when someone’s watching?",
        "options": [
          {
            "label": "Alone, self-motivation is my strength",
            "score": {
              "accountability": 10
            }
          },
          {
            "label": "A bit of both",
            "score": {
              "accountability": 5
            }
          },
          {
            "label": "Definitely need someone pushing me",
            "score": {
              "accountability": 0
            }
          }
        ]
      },
      {
        "text": "Do you prefer 1-on-1 attention or the energy of a group?",
        "options": [
          {
            "label": "1-on-1",
            "score": {
              "style": 10,
              "schedule": 10
            }
          },
          {
            "label": "Small group",
            "score": {
              "style": 5,
              "schedule": 5
            }
          },
          {
            "label": "Either works",
            "score": {
              "style": 0,
              "schedule": 0
            }
          }
        ]
      },
      {
        "text": "What would it take for you to actually stick with this, this time?",
        "options": [
          {
            "label": "Just the right plan — I’m self-driven",
            "score": {
              "accountability": 10,
              "style": 10
            }
          },
          {
            "label": "Some regular check-ins would help a lot",
            "score": {
              "accountability": 5,
              "style": 5
            }
          },
          {
            "label": "Honestly, someone holding me to it",
            "score": {
              "accountability": 0,
              "style": 0
            }
          }
        ]
      },
      {
        "text": "What’s your history with trainers or programs been like?",
        "options": [
          {
            "label": "Good, I’ve had success before",
            "score": {
              "style": 10,
              "accountability": 10
            }
          },
          {
            "label": "Mixed, hit or miss",
            "score": {
              "style": 5,
              "accountability": 5
            }
          },
          {
            "label": "Never really worked out for me",
            "score": {
              "style": 0,
              "accountability": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Clear match"
      },
      {
        "min": 40,
        "label": "A few good options"
      },
      {
        "min": 0,
        "label": "Let’s talk first"
      }
    ],
    "ctaLabel": "See your matched trainer",
    "sortOrder": 17
  },
  {
    "slug": "join-the-waitlist-new-cohort",
    "title": "Join the Waitlist — New Cohort",
    "description": "Validate demand and build urgency before you launch.",
    "filterCategory": "events",
    "coverImage": "/covers/join-the-waitlist-new-cohort.svg",
    "intro": "A few honest questions about what’s actually bringing you here.",
    "categories": [
      {
        "key": "intent",
        "label": "Purchase intent"
      },
      {
        "key": "timing",
        "label": "Timing"
      },
      {
        "key": "need",
        "label": "Underlying need"
      }
    ],
    "questions": [
      {
        "text": "What’s the real problem you’re hoping this solves for you?",
        "options": [
          {
            "label": "Something specific I’m actively struggling with",
            "score": {
              "need": 10,
              "intent": 10
            }
          },
          {
            "label": "A general sense I want to level up",
            "score": {
              "need": 5,
              "intent": 5
            }
          },
          {
            "label": "Just browsing, nothing pressing",
            "score": {
              "need": 0,
              "intent": 0
            }
          }
        ]
      },
      {
        "text": "How likely are you to actually join when this opens?",
        "options": [
          {
            "label": "Very likely",
            "score": {
              "intent": 10
            }
          },
          {
            "label": "Somewhat likely",
            "score": {
              "intent": 5
            }
          },
          {
            "label": "Just curious",
            "score": {
              "intent": 0
            }
          }
        ]
      },
      {
        "text": "What have you already tried that hasn’t fully worked?",
        "options": [
          {
            "label": "A few things, still looking for the right fit",
            "score": {
              "need": 10,
              "timing": 5
            }
          },
          {
            "label": "One or two things, casually",
            "score": {
              "need": 5,
              "timing": 5
            }
          },
          {
            "label": "Nothing yet, this would be my first step",
            "score": {
              "need": 0,
              "timing": 0
            }
          }
        ]
      },
      {
        "text": "When would you actually want this to start changing your situation?",
        "options": [
          {
            "label": "As soon as it opens",
            "score": {
              "timing": 10
            }
          },
          {
            "label": "Within a few months",
            "score": {
              "timing": 5
            }
          },
          {
            "label": "No real rush",
            "score": {
              "timing": 0
            }
          }
        ]
      },
      {
        "text": "Have you actively been searching for something like this?",
        "options": [
          {
            "label": "Yes, actively searching",
            "score": {
              "intent": 10,
              "timing": 10
            }
          },
          {
            "label": "Thought about it, not seriously searched",
            "score": {
              "intent": 5,
              "timing": 5
            }
          },
          {
            "label": "Not really",
            "score": {
              "intent": 0,
              "timing": 0
            }
          }
        ]
      },
      {
        "text": "What would change for you personally if this actually worked out?",
        "options": [
          {
            "label": "Something significant",
            "score": {
              "need": 10,
              "timing": 10
            }
          },
          {
            "label": "A nice improvement",
            "score": {
              "need": 5,
              "timing": 5
            }
          },
          {
            "label": "Not much either way",
            "score": {
              "need": 0,
              "timing": 0
            }
          }
        ]
      },
      {
        "text": "How would it feel to finally get off the sidelines on this?",
        "options": [
          {
            "label": "A real relief — I’ve been waiting for this",
            "score": {
              "intent": 10,
              "need": 10
            }
          },
          {
            "label": "Good, though I’m not in a rush",
            "score": {
              "intent": 5,
              "need": 5
            }
          },
          {
            "label": "Not a strong feeling either way",
            "score": {
              "intent": 0,
              "need": 0
            }
          }
        ]
      },
      {
        "text": "What’s the honest reason you haven’t solved this already?",
        "options": [
          {
            "label": "Never found the right thing until now",
            "score": {
              "need": 10,
              "intent": 10
            }
          },
          {
            "label": "Kept putting it off",
            "score": {
              "need": 5,
              "intent": 5
            }
          },
          {
            "label": "It hasn’t really been a priority",
            "score": {
              "need": 0,
              "intent": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "High-intent lead"
      },
      {
        "min": 40,
        "label": "Warm interest"
      },
      {
        "min": 0,
        "label": "Early curiosity"
      }
    ],
    "ctaLabel": "Join the waitlist",
    "sortOrder": 18
  },
  {
    "slug": "free-masterclass-registration",
    "title": "Free Masterclass Registration",
    "description": "Registration that pre-qualifies attendees as it converts.",
    "filterCategory": "events",
    "coverImage": "/covers/free-masterclass-registration.svg",
    "intro": "A few honest questions about what’s bringing you to this session.",
    "categories": [
      {
        "key": "relevance",
        "label": "Topic relevance"
      },
      {
        "key": "intent",
        "label": "Follow-through intent"
      },
      {
        "key": "struggle",
        "label": "Current struggle"
      }
    ],
    "questions": [
      {
        "text": "What’s the specific struggle that made you register for this?",
        "options": [
          {
            "label": "Something I’m actively stuck on right now",
            "score": {
              "struggle": 10,
              "relevance": 10
            }
          },
          {
            "label": "A general area I want to improve",
            "score": {
              "struggle": 5,
              "relevance": 5
            }
          },
          {
            "label": "Nothing specific, just curious",
            "score": {
              "struggle": 0,
              "relevance": 0
            }
          }
        ]
      },
      {
        "text": "How relevant is this topic to something you’re actually dealing with right now?",
        "options": [
          {
            "label": "Extremely relevant",
            "score": {
              "relevance": 10
            }
          },
          {
            "label": "Somewhat relevant",
            "score": {
              "relevance": 5
            }
          },
          {
            "label": "Just curious",
            "score": {
              "relevance": 0
            }
          }
        ]
      },
      {
        "text": "Have you tried to figure this out on your own already?",
        "options": [
          {
            "label": "Yes, and I’m still stuck",
            "score": {
              "struggle": 10,
              "intent": 10
            }
          },
          {
            "label": "A little, casually",
            "score": {
              "struggle": 5,
              "intent": 5
            }
          },
          {
            "label": "No, haven’t really tried",
            "score": {
              "struggle": 0,
              "intent": 0
            }
          }
        ]
      },
      {
        "text": "Will you actually clear your schedule to attend live, or catch the replay someday?",
        "options": [
          {
            "label": "Live, definitely",
            "score": {
              "intent": 10
            }
          },
          {
            "label": "I’ll try",
            "score": {
              "intent": 5
            }
          },
          {
            "label": "Probably the replay, if at all",
            "score": {
              "intent": 0
            }
          }
        ]
      },
      {
        "text": "What would it mean for you if you actually solved this by the end of the session?",
        "options": [
          {
            "label": "A real weight off my shoulders",
            "score": {
              "struggle": 10,
              "relevance": 10
            }
          },
          {
            "label": "That would be helpful",
            "score": {
              "struggle": 5,
              "relevance": 5
            }
          },
          {
            "label": "Not a big deal either way",
            "score": {
              "struggle": 0,
              "relevance": 0
            }
          }
        ]
      },
      {
        "text": "Are you open to a follow-up conversation after the session if it’s relevant to you?",
        "options": [
          {
            "label": "Yes",
            "score": {
              "relevance": 10,
              "intent": 10
            }
          },
          {
            "label": "Maybe",
            "score": {
              "relevance": 5,
              "intent": 5
            }
          },
          {
            "label": "No",
            "score": {
              "relevance": 0,
              "intent": 0
            }
          }
        ]
      },
      {
        "text": "How long has this particular issue actually been sitting unresolved?",
        "options": [
          {
            "label": "A long time — I keep meaning to fix it",
            "score": {
              "struggle": 10
            }
          },
          {
            "label": "A few weeks or months",
            "score": {
              "struggle": 5
            }
          },
          {
            "label": "It’s pretty new for me",
            "score": {
              "struggle": 0
            }
          }
        ]
      },
      {
        "text": "What’s stopped you from getting this sorted before now?",
        "options": [
          {
            "label": "Never found something that actually addressed it",
            "score": {
              "struggle": 10,
              "relevance": 10
            }
          },
          {
            "label": "Kept putting it off",
            "score": {
              "struggle": 5,
              "relevance": 5
            }
          },
          {
            "label": "Hasn’t been a priority",
            "score": {
              "struggle": 0,
              "relevance": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Highly engaged"
      },
      {
        "min": 40,
        "label": "Interested"
      },
      {
        "min": 0,
        "label": "Casual signup"
      }
    ],
    "ctaLabel": "Save my seat",
    "sortOrder": 19
  },
  {
    "slug": "event-sponsorship-interest-form",
    "title": "Event Sponsorship Interest Form",
    "description": "Qualify sponsor leads by budget before your team follows up.",
    "filterCategory": "events",
    "coverImage": "/covers/event-sponsorship-interest-form.svg",
    "intro": "A few honest questions about what sponsorship is actually meant to do for you.",
    "categories": [
      {
        "key": "budget",
        "label": "Sponsorship budget"
      },
      {
        "key": "fit",
        "label": "Audience fit"
      },
      {
        "key": "pressure",
        "label": "Growth pressure"
      }
    ],
    "questions": [
      {
        "text": "What’s the pressure you’re actually under to bring in new business right now?",
        "options": [
          {
            "label": "High — leadership is watching pipeline closely",
            "score": {
              "pressure": 10
            }
          },
          {
            "label": "Moderate, steady expectation",
            "score": {
              "pressure": 5
            }
          },
          {
            "label": "Low, this is more exploratory",
            "score": {
              "pressure": 0
            }
          }
        ]
      },
      {
        "text": "What’s your approximate sponsorship budget for something like this?",
        "options": [
          {
            "label": "Over ₦1,000,000",
            "score": {
              "budget": 10
            }
          },
          {
            "label": "₦200,000 – ₦1,000,000",
            "score": {
              "budget": 5
            }
          },
          {
            "label": "Under ₦200,000",
            "score": {
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "Has a past sponsorship or partnership ever failed to deliver what you hoped?",
        "options": [
          {
            "label": "No, sponsorships have worked well for us",
            "score": {
              "pressure": 10,
              "fit": 10
            }
          },
          {
            "label": "Mixed results before",
            "score": {
              "pressure": 5,
              "fit": 5
            }
          },
          {
            "label": "Yes, and it made me cautious",
            "score": {
              "pressure": 0,
              "fit": 0
            }
          }
        ]
      },
      {
        "text": "How relevant is this audience to the people you’re actually trying to reach?",
        "options": [
          {
            "label": "Very relevant",
            "score": {
              "fit": 10
            }
          },
          {
            "label": "Somewhat relevant",
            "score": {
              "fit": 5
            }
          },
          {
            "label": "Not sure yet",
            "score": {
              "fit": 0
            }
          }
        ]
      },
      {
        "text": "What would it mean for your business if this partnership landed the right leads?",
        "options": [
          {
            "label": "A real difference to this quarter’s numbers",
            "score": {
              "pressure": 10,
              "budget": 10
            }
          },
          {
            "label": "A nice bonus, not critical",
            "score": {
              "pressure": 5,
              "budget": 5
            }
          },
          {
            "label": "Not something I’m tracking closely",
            "score": {
              "pressure": 0,
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "Have you sponsored a similar event before?",
        "options": [
          {
            "label": "Yes",
            "score": {
              "budget": 10,
              "fit": 10
            }
          },
          {
            "label": "Considered it",
            "score": {
              "budget": 5,
              "fit": 5
            }
          },
          {
            "label": "No",
            "score": {
              "budget": 0,
              "fit": 0
            }
          }
        ]
      },
      {
        "text": "What’s the honest reason you haven’t committed to something like this before?",
        "options": [
          {
            "label": "Never found the right audience match",
            "score": {
              "fit": 10,
              "budget": 5
            }
          },
          {
            "label": "Budget timing wasn’t right",
            "score": {
              "budget": 0
            }
          },
          {
            "label": "Nothing’s stopped me, this is new territory",
            "score": {
              "fit": 10,
              "budget": 10
            }
          }
        ]
      },
      {
        "text": "How does leadership react when a marketing spend doesn’t pay off?",
        "options": [
          {
            "label": "They’re understanding, it’s part of testing",
            "score": {
              "pressure": 10
            }
          },
          {
            "label": "Some pushback, but manageable",
            "score": {
              "pressure": 5
            }
          },
          {
            "label": "It’s a real problem for me",
            "score": {
              "pressure": 0
            }
          }
        ]
      },
      {
        "text": "Who makes the final call on sponsorship spend in your organisation?",
        "options": [
          {
            "label": "Me, directly",
            "score": {
              "budget": 10,
              "pressure": 10
            }
          },
          {
            "label": "Me, with sign-off from someone else",
            "score": {
              "budget": 5,
              "pressure": 5
            }
          },
          {
            "label": "Someone else entirely",
            "score": {
              "budget": 0,
              "pressure": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Strong sponsor fit"
      },
      {
        "min": 40,
        "label": "Worth a call"
      },
      {
        "min": 0,
        "label": "Early interest"
      }
    ],
    "ctaLabel": "Talk to our partnerships team",
    "sortOrder": 20
  },
  {
    "slug": "solar-readiness-assessment",
    "title": "Solar Readiness Assessment",
    "description": "Score a property on budget, roof space, and current generator spend before a site visit.",
    "filterCategory": "solar",
    "coverImage": "/covers/solar-readiness-assessment.svg",
    "intro": "A few honest questions about what power problems are actually costing you.",
    "categories": [
      {
        "key": "budget",
        "label": "Budget"
      },
      {
        "key": "suitability",
        "label": "Property suitability"
      },
      {
        "key": "pain",
        "label": "Power pain"
      }
    ],
    "questions": [
      {
        "text": "What actually happens in your home during a long power outage?",
        "options": [
          {
            "label": "Barely notice it, we’re prepared",
            "score": {
              "pain": 10
            }
          },
          {
            "label": "It’s annoying but manageable",
            "score": {
              "pain": 5
            }
          },
          {
            "label": "Real disruption, it derails the day",
            "score": {
              "pain": 0
            }
          }
        ]
      },
      {
        "text": "How does it feel every time you have to refill the generator?",
        "options": [
          {
            "label": "Not a big deal, honestly",
            "score": {
              "pain": 10,
              "budget": 5
            }
          },
          {
            "label": "A bit frustrating, adds up",
            "score": {
              "pain": 5,
              "budget": 5
            }
          },
          {
            "label": "Genuinely exhausting, I’m tired of it",
            "score": {
              "pain": 0,
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "What’s your current monthly spend on generator fuel, honestly?",
        "options": [
          {
            "label": "Over ₦80,000",
            "score": {
              "budget": 10
            }
          },
          {
            "label": "₦20,000 – ₦80,000",
            "score": {
              "budget": 5
            }
          },
          {
            "label": "Under ₦20,000",
            "score": {
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "Has a power outage ever cost you something you couldn’t get back — spoiled food, a missed deadline, a bad night?",
        "options": [
          {
            "label": "Yes, more than once",
            "score": {
              "pain": 10
            }
          },
          {
            "label": "Once or twice",
            "score": {
              "pain": 5
            }
          },
          {
            "label": "Not really",
            "score": {
              "pain": 0
            }
          }
        ]
      },
      {
        "text": "Does your roof get good sun exposure most of the day?",
        "options": [
          {
            "label": "Yes, mostly unshaded",
            "score": {
              "suitability": 10
            }
          },
          {
            "label": "Partial shade",
            "score": {
              "suitability": 5
            }
          },
          {
            "label": "Not sure",
            "score": {
              "suitability": 0
            }
          }
        ]
      },
      {
        "text": "What’s the noise and smell of a generator actually like for your household?",
        "options": [
          {
            "label": "Doesn’t bother us much",
            "score": {
              "pain": 10
            }
          },
          {
            "label": "Tolerable, but not ideal",
            "score": {
              "pain": 5
            }
          },
          {
            "label": "A genuine source of stress",
            "score": {
              "pain": 0
            }
          }
        ]
      },
      {
        "text": "Do you own the property?",
        "options": [
          {
            "label": "Yes",
            "score": {
              "budget": 10,
              "suitability": 10
            }
          },
          {
            "label": "Long-term lease",
            "score": {
              "budget": 5,
              "suitability": 5
            }
          },
          {
            "label": "Renting short-term",
            "score": {
              "budget": 0,
              "suitability": 0
            }
          }
        ]
      },
      {
        "text": "What would it actually mean for you to never worry about fuel or blackouts again?",
        "options": [
          {
            "label": "A real, meaningful relief",
            "score": {
              "pain": 10,
              "budget": 10
            }
          },
          {
            "label": "It would help",
            "score": {
              "pain": 5,
              "budget": 5
            }
          },
          {
            "label": "Not something I think about much",
            "score": {
              "pain": 0,
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "What’s stopped you from switching to solar before now?",
        "options": [
          {
            "label": "Just hadn’t gotten around to exploring it",
            "score": {
              "budget": 10,
              "suitability": 10
            }
          },
          {
            "label": "Wasn’t sure it would actually pay off",
            "score": {
              "budget": 5,
              "suitability": 5
            }
          },
          {
            "label": "Assumed it was out of reach for me",
            "score": {
              "budget": 0,
              "suitability": 0
            }
          }
        ]
      },
      {
        "text": "How often do you find yourself rationing power to essentials only?",
        "options": [
          {
            "label": "Rarely, we run things normally",
            "score": {
              "pain": 10
            }
          },
          {
            "label": "Sometimes, during bad stretches",
            "score": {
              "pain": 5
            }
          },
          {
            "label": "Often — it’s become routine",
            "score": {
              "pain": 0
            }
          }
        ]
      },
      {
        "text": "Is there anyone else who needs to agree before you can move forward with a solar setup?",
        "options": [
          {
            "label": "No, it’s my call alone",
            "score": {
              "suitability": 10,
              "budget": 5
            }
          },
          {
            "label": "Yes, but we’re aligned",
            "score": {
              "suitability": 5,
              "budget": 5
            }
          },
          {
            "label": "Yes, and we haven’t discussed it yet",
            "score": {
              "suitability": 0,
              "budget": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Solar-ready"
      },
      {
        "min": 40,
        "label": "Worth exploring"
      },
      {
        "min": 0,
        "label": "Not yet"
      }
    ],
    "ctaLabel": "Book a free site survey",
    "sortOrder": 21
  },
  {
    "slug": "which-power-solution-fits-you",
    "title": "Which Power Solution Fits You?",
    "description": "Match a household or business to solar, generator, or hybrid based on real usage patterns.",
    "filterCategory": "solar",
    "coverImage": "/covers/which-power-solution-fits-you.svg",
    "intro": "A few honest questions about how power problems actually show up in your day.",
    "categories": [
      {
        "key": "usage",
        "label": "Power usage"
      },
      {
        "key": "budget",
        "label": "Budget"
      },
      {
        "key": "reliability",
        "label": "Reliability need"
      }
    ],
    "questions": [
      {
        "text": "What’s the worst moment a power cut has actually caused you?",
        "options": [
          {
            "label": "Nothing too bad, honestly",
            "score": {
              "reliability": 10
            }
          },
          {
            "label": "A ruined evening or lost work time",
            "score": {
              "reliability": 5
            }
          },
          {
            "label": "Something costly — spoiled goods, missed deadlines",
            "score": {
              "reliability": 0
            }
          }
        ]
      },
      {
        "text": "How many hours a day do you actually need power to run without interruption?",
        "options": [
          {
            "label": "12+ hours",
            "score": {
              "usage": 10
            }
          },
          {
            "label": "4–12 hours",
            "score": {
              "usage": 5
            }
          },
          {
            "label": "Just a few hours",
            "score": {
              "usage": 0
            }
          }
        ]
      },
      {
        "text": "What’s your budget for actually solving this, once and for all?",
        "options": [
          {
            "label": "Over ₦3,000,000",
            "score": {
              "budget": 10
            }
          },
          {
            "label": "₦800,000 – ₦3,000,000",
            "score": {
              "budget": 5
            }
          },
          {
            "label": "Under ₦800,000",
            "score": {
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "Do you run appliances that genuinely can’t afford to lose power — freezers, medical equipment, machinery?",
        "options": [
          {
            "label": "Yes, several",
            "score": {
              "usage": 10,
              "reliability": 10
            }
          },
          {
            "label": "A few",
            "score": {
              "usage": 5,
              "reliability": 5
            }
          },
          {
            "label": "Mostly lights and electronics",
            "score": {
              "usage": 0,
              "reliability": 0
            }
          }
        ]
      },
      {
        "text": "How much does unreliable power actually cost you in a bad month?",
        "options": [
          {
            "label": "A significant amount",
            "score": {
              "budget": 10,
              "reliability": 10
            }
          },
          {
            "label": "A noticeable but manageable amount",
            "score": {
              "budget": 5,
              "reliability": 5
            }
          },
          {
            "label": "Not much I can point to",
            "score": {
              "budget": 0,
              "reliability": 0
            }
          }
        ]
      },
      {
        "text": "How do you feel every time the power cuts unexpectedly?",
        "options": [
          {
            "label": "Barely register it anymore",
            "score": {
              "reliability": 10
            }
          },
          {
            "label": "Mildly annoyed",
            "score": {
              "reliability": 5
            }
          },
          {
            "label": "Genuinely frustrated, every time",
            "score": {
              "reliability": 0
            }
          }
        ]
      },
      {
        "text": "Have you already tried a solution that didn’t hold up?",
        "options": [
          {
            "label": "No, this is my first real attempt to fix it",
            "score": {
              "budget": 10,
              "usage": 10
            }
          },
          {
            "label": "Yes, but it wasn’t quite enough",
            "score": {
              "budget": 5,
              "usage": 5
            }
          },
          {
            "label": "Yes, and it was a waste of money",
            "score": {
              "budget": 0,
              "usage": 0
            }
          }
        ]
      },
      {
        "text": "What would peace of mind about power actually be worth to you?",
        "options": [
          {
            "label": "A lot — I’d invest properly to get it",
            "score": {
              "budget": 10,
              "reliability": 10
            }
          },
          {
            "label": "Something, within reason",
            "score": {
              "budget": 5,
              "reliability": 5
            }
          },
          {
            "label": "Not something I’d spend much on",
            "score": {
              "budget": 0,
              "reliability": 0
            }
          }
        ]
      },
      {
        "text": "How does your household or team react when the power goes out?",
        "options": [
          {
            "label": "Barely notice, we’ve adapted well",
            "score": {
              "reliability": 10
            }
          },
          {
            "label": "Some grumbling, but we cope",
            "score": {
              "reliability": 5
            }
          },
          {
            "label": "Real frustration every time",
            "score": {
              "reliability": 0
            }
          }
        ]
      },
      {
        "text": "What’s stopped you from solving this properly before now?",
        "options": [
          {
            "label": "Just hadn’t prioritized it yet",
            "score": {
              "budget": 10,
              "usage": 10
            }
          },
          {
            "label": "Wasn’t sure what setup actually fits my needs",
            "score": {
              "budget": 5,
              "usage": 5
            }
          },
          {
            "label": "Assumed a proper solution was out of reach",
            "score": {
              "budget": 0,
              "usage": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Hybrid system fit"
      },
      {
        "min": 40,
        "label": "Mid-range solution"
      },
      {
        "min": 0,
        "label": "Entry-level fit"
      }
    ],
    "ctaLabel": "Get a free power plan",
    "sortOrder": 22
  },
  {
    "slug": "commercial-power-audit",
    "title": "Commercial Power Audit",
    "description": "Qualify B2B installer leads by facility size, downtime cost, and current power spend.",
    "filterCategory": "solar",
    "coverImage": "/covers/commercial-power-audit.svg",
    "intro": "A few honest questions about what downtime is actually costing your operation.",
    "categories": [
      {
        "key": "scale",
        "label": "Facility scale"
      },
      {
        "key": "urgency",
        "label": "Downtime urgency"
      },
      {
        "key": "exposure",
        "label": "Financial exposure"
      }
    ],
    "questions": [
      {
        "text": "What actually happens on the shop floor or in the office the moment power drops?",
        "options": [
          {
            "label": "Nothing much, we barely feel it",
            "score": {
              "urgency": 10
            }
          },
          {
            "label": "A pause, some disruption",
            "score": {
              "urgency": 5
            }
          },
          {
            "label": "Everything stops — it’s costly immediately",
            "score": {
              "urgency": 0
            }
          }
        ]
      },
      {
        "text": "How large is your facility or site, honestly?",
        "options": [
          {
            "label": "Large / industrial",
            "score": {
              "scale": 10
            }
          },
          {
            "label": "Medium commercial",
            "score": {
              "scale": 5
            }
          },
          {
            "label": "Small office/shop",
            "score": {
              "scale": 0
            }
          }
        ]
      },
      {
        "text": "Has a power failure ever caused you to lose a client, an order, or a deadline?",
        "options": [
          {
            "label": "No, never happened",
            "score": {
              "exposure": 10,
              "urgency": 10
            }
          },
          {
            "label": "A close call once",
            "score": {
              "exposure": 5,
              "urgency": 5
            }
          },
          {
            "label": "Yes, and it was damaging",
            "score": {
              "exposure": 0,
              "urgency": 0
            }
          }
        ]
      },
      {
        "text": "How costly is downtime for your business, in real terms?",
        "options": [
          {
            "label": "Very costly — operations stop entirely",
            "score": {
              "urgency": 10
            }
          },
          {
            "label": "Noticeable but manageable",
            "score": {
              "urgency": 5
            }
          },
          {
            "label": "Minor inconvenience",
            "score": {
              "urgency": 0
            }
          }
        ]
      },
      {
        "text": "What’s your current monthly power or generator spend, honestly?",
        "options": [
          {
            "label": "Over ₦1,000,000",
            "score": {
              "scale": 10,
              "urgency": 10
            }
          },
          {
            "label": "₦200,000 – ₦1,000,000",
            "score": {
              "scale": 5,
              "urgency": 5
            }
          },
          {
            "label": "Under ₦200,000",
            "score": {
              "scale": 0,
              "urgency": 0
            }
          }
        ]
      },
      {
        "text": "How does leadership react when an outage disrupts operations?",
        "options": [
          {
            "label": "It’s treated as a serious issue",
            "score": {
              "exposure": 10
            }
          },
          {
            "label": "Noted, but not escalated much",
            "score": {
              "exposure": 5
            }
          },
          {
            "label": "Nobody really tracks it",
            "score": {
              "exposure": 0
            }
          }
        ]
      },
      {
        "text": "What would a full day of downtime actually cost you, if you had to put a number on it?",
        "options": [
          {
            "label": "A substantial amount",
            "score": {
              "exposure": 10,
              "scale": 10
            }
          },
          {
            "label": "A moderate, felt amount",
            "score": {
              "exposure": 5,
              "scale": 5
            }
          },
          {
            "label": "Not much, honestly",
            "score": {
              "exposure": 0,
              "scale": 0
            }
          }
        ]
      },
      {
        "text": "Has an unreliable power supply ever put your equipment or inventory at risk?",
        "options": [
          {
            "label": "No, we’ve been well protected",
            "score": {
              "exposure": 10,
              "urgency": 10
            }
          },
          {
            "label": "A close call once or twice",
            "score": {
              "exposure": 5,
              "urgency": 5
            }
          },
          {
            "label": "Yes, and it was expensive",
            "score": {
              "exposure": 0,
              "urgency": 0
            }
          }
        ]
      },
      {
        "text": "What’s stopped your business from solving this properly before now?",
        "options": [
          {
            "label": "It hasn’t been urgent until recently",
            "score": {
              "scale": 10,
              "exposure": 10
            }
          },
          {
            "label": "Budget approval has been slow",
            "score": {
              "scale": 5,
              "exposure": 5
            }
          },
          {
            "label": "Never fully scoped what it would take",
            "score": {
              "scale": 0,
              "exposure": 0
            }
          }
        ]
      },
      {
        "text": "How many people or departments actually feel the impact when the power fails?",
        "options": [
          {
            "label": "The whole operation",
            "score": {
              "scale": 10,
              "urgency": 10
            }
          },
          {
            "label": "A specific department or team",
            "score": {
              "scale": 5,
              "urgency": 5
            }
          },
          {
            "label": "Barely anyone notices",
            "score": {
              "scale": 0,
              "urgency": 0
            }
          }
        ]
      },
      {
        "text": "Have you had to explain a power-related loss to a client or board before?",
        "options": [
          {
            "label": "No, never had to",
            "score": {
              "exposure": 10
            }
          },
          {
            "label": "Once, and it was uncomfortable",
            "score": {
              "exposure": 5
            }
          },
          {
            "label": "Yes, more than once",
            "score": {
              "exposure": 0
            }
          }
        ]
      },
      {
        "text": "What would it mean for the business if power stopped being a risk factor at all?",
        "options": [
          {
            "label": "A genuine competitive advantage",
            "score": {
              "exposure": 10,
              "scale": 10
            }
          },
          {
            "label": "A meaningful operational improvement",
            "score": {
              "exposure": 5,
              "scale": 5
            }
          },
          {
            "label": "Not something that changes much for us",
            "score": {
              "exposure": 0,
              "scale": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "High-priority lead"
      },
      {
        "min": 40,
        "label": "Worth quoting"
      },
      {
        "min": 0,
        "label": "Early conversation"
      }
    ],
    "ctaLabel": "Request a commercial quote",
    "sortOrder": 23
  },
  {
    "slug": "visa-eligibility-pre-check",
    "title": "Visa Eligibility Pre-Check",
    "description": "Screen relocation leads on route, budget, and readiness before a paid consultation.",
    "filterCategory": "japa",
    "coverImage": "/covers/visa-eligibility-pre-check.svg",
    "intro": "A few honest questions about where this relocation journey actually stands for you.",
    "categories": [
      {
        "key": "documentation",
        "label": "Documentation"
      },
      {
        "key": "finances",
        "label": "Financial readiness"
      },
      {
        "key": "confidence",
        "label": "Application confidence"
      }
    ],
    "questions": [
      {
        "text": "What’s the fear that actually crosses your mind when you think about applying?",
        "options": [
          {
            "label": "Not much fear — I feel prepared",
            "score": {
              "confidence": 10
            }
          },
          {
            "label": "Some worry about getting it wrong",
            "score": {
              "confidence": 5
            }
          },
          {
            "label": "Real fear of being refused again",
            "score": {
              "confidence": 0
            }
          }
        ]
      },
      {
        "text": "Do you have a valid international passport, right now?",
        "options": [
          {
            "label": "Yes, valid for 2+ years",
            "score": {
              "documentation": 10
            }
          },
          {
            "label": "Yes, but expiring soon",
            "score": {
              "documentation": 5
            }
          },
          {
            "label": "No, or it’s expired",
            "score": {
              "documentation": 0
            }
          }
        ]
      },
      {
        "text": "Has a visa refusal (yours or someone close to you) ever left you feeling defeated?",
        "options": [
          {
            "label": "No, that hasn’t happened to me",
            "score": {
              "confidence": 10,
              "documentation": 10
            }
          },
          {
            "label": "Somewhat, it made me more cautious",
            "score": {
              "confidence": 5,
              "documentation": 5
            }
          },
          {
            "label": "Yes, and it still affects how I feel about this",
            "score": {
              "confidence": 0,
              "documentation": 0
            }
          }
        ]
      },
      {
        "text": "Do you actually have proof of funds ready for your target country?",
        "options": [
          {
            "label": "Yes, fully ready",
            "score": {
              "finances": 10
            }
          },
          {
            "label": "Partially ready",
            "score": {
              "finances": 5
            }
          },
          {
            "label": "Not yet",
            "score": {
              "finances": 0
            }
          }
        ]
      },
      {
        "text": "What keeps you up at night about the financial side of this move?",
        "options": [
          {
            "label": "Nothing, I feel financially prepared",
            "score": {
              "finances": 10
            }
          },
          {
            "label": "Some anxiety about the numbers",
            "score": {
              "finances": 5
            }
          },
          {
            "label": "Real stress — I’m not sure it’s enough",
            "score": {
              "finances": 0
            }
          }
        ]
      },
      {
        "text": "Have you had a visa refusal before?",
        "options": [
          {
            "label": "No",
            "score": {
              "documentation": 10,
              "finances": 10,
              "confidence": 10
            }
          },
          {
            "label": "Yes, once",
            "score": {
              "documentation": 5,
              "finances": 5,
              "confidence": 5
            }
          },
          {
            "label": "Yes, more than once",
            "score": {
              "documentation": 0,
              "finances": 0,
              "confidence": 0
            }
          }
        ]
      },
      {
        "text": "How do you feel gathering all the paperwork for an application like this?",
        "options": [
          {
            "label": "Organized, I know exactly what’s needed",
            "score": {
              "documentation": 10,
              "confidence": 10
            }
          },
          {
            "label": "A bit overwhelmed, but managing",
            "score": {
              "documentation": 5,
              "confidence": 5
            }
          },
          {
            "label": "Genuinely lost on where to start",
            "score": {
              "documentation": 0,
              "confidence": 0
            }
          }
        ]
      },
      {
        "text": "What’s the real reason this application hasn’t been submitted yet, if it hasn’t?",
        "options": [
          {
            "label": "It has, or I’m fully ready to",
            "score": {
              "confidence": 10,
              "documentation": 10
            }
          },
          {
            "label": "Still gathering a few things",
            "score": {
              "confidence": 5,
              "documentation": 5
            }
          },
          {
            "label": "Honestly, I keep putting it off out of fear",
            "score": {
              "confidence": 0,
              "documentation": 0
            }
          }
        ]
      },
      {
        "text": "Has anyone close to you been rejected for a visa, and how did that affect you?",
        "options": [
          {
            "label": "No, or it didn’t change how I feel",
            "score": {
              "confidence": 10
            }
          },
          {
            "label": "A little, made me more careful",
            "score": {
              "confidence": 5
            }
          },
          {
            "label": "Yes, it really worried me",
            "score": {
              "confidence": 0
            }
          }
        ]
      },
      {
        "text": "What would it mean for you personally if this application actually succeeded?",
        "options": [
          {
            "label": "A major life shift I’ve been working toward",
            "score": {
              "finances": 10,
              "confidence": 10
            }
          },
          {
            "label": "A big step forward",
            "score": {
              "finances": 5,
              "confidence": 5
            }
          },
          {
            "label": "Still figuring out what it would mean",
            "score": {
              "finances": 0,
              "confidence": 0
            }
          }
        ]
      },
      {
        "text": "How confident are you, honestly, that your finances would hold up to scrutiny?",
        "options": [
          {
            "label": "Very confident",
            "score": {
              "finances": 10
            }
          },
          {
            "label": "Reasonably, with some gaps",
            "score": {
              "finances": 5
            }
          },
          {
            "label": "Not confident at all",
            "score": {
              "finances": 0
            }
          }
        ]
      },
      {
        "text": "What’s the one document or requirement you’ve been avoiding dealing with?",
        "options": [
          {
            "label": "Nothing, I’m on top of it all",
            "score": {
              "documentation": 10,
              "confidence": 10
            }
          },
          {
            "label": "One thing I keep putting off",
            "score": {
              "documentation": 5,
              "confidence": 5
            }
          },
          {
            "label": "Honestly, several things",
            "score": {
              "documentation": 0,
              "confidence": 0
            }
          }
        ]
      },
      {
        "text": "Do you know exactly which visa route actually fits your situation?",
        "options": [
          {
            "label": "Yes, clearly",
            "score": {
              "confidence": 10,
              "documentation": 10
            }
          },
          {
            "label": "I have a rough idea",
            "score": {
              "confidence": 5,
              "documentation": 5
            }
          },
          {
            "label": "No, I’m still confused about it",
            "score": {
              "confidence": 0,
              "documentation": 0
            }
          }
        ]
      },
      {
        "text": "What would it feel like to finally have an expert confirm you’re on the right track?",
        "options": [
          {
            "label": "A real relief — that’s what I need",
            "score": {
              "confidence": 10,
              "finances": 10
            }
          },
          {
            "label": "Reassuring, would help",
            "score": {
              "confidence": 5,
              "finances": 5
            }
          },
          {
            "label": "Not something I’ve thought about",
            "score": {
              "confidence": 0,
              "finances": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Strong eligibility"
      },
      {
        "min": 40,
        "label": "Some gaps to close"
      },
      {
        "min": 0,
        "label": "Needs real preparation"
      }
    ],
    "ctaLabel": "Book a visa consultation",
    "sortOrder": 24
  },
  {
    "slug": "which-country-fits-your-japa-plan",
    "title": "Which Country Fits Your Japa Plan?",
    "description": "Match a prospect to the right destination and visa route based on their own goals.",
    "filterCategory": "japa",
    "coverImage": "/covers/which-country-fits-your-japa-plan.svg",
    "intro": "A few honest questions about what’s actually driving this decision for you.",
    "categories": [
      {
        "key": "goals",
        "label": "Relocation clarity"
      },
      {
        "key": "readiness",
        "label": "Readiness"
      },
      {
        "key": "push",
        "label": "What’s pushing you"
      }
    ],
    "questions": [
      {
        "text": "What’s the real thing pushing you to consider leaving right now?",
        "options": [
          {
            "label": "A specific frustration I want to escape",
            "score": {
              "push": 10
            }
          },
          {
            "label": "A general sense there’s more out there for me",
            "score": {
              "push": 5
            }
          },
          {
            "label": "Just exploring, nothing pressing",
            "score": {
              "push": 0
            }
          }
        ]
      },
      {
        "text": "What’s your honest main reason for relocating?",
        "options": [
          {
            "label": "Work opportunities",
            "score": {
              "goals": 10
            }
          },
          {
            "label": "Further study",
            "score": {
              "goals": 7
            }
          },
          {
            "label": "Still deciding",
            "score": {
              "goals": 0
            }
          }
        ]
      },
      {
        "text": "How does staying where you are make you feel when you’re honest with yourself?",
        "options": [
          {
            "label": "Genuinely limited, held back",
            "score": {
              "push": 10
            }
          },
          {
            "label": "Fine, but I sense a ceiling",
            "score": {
              "push": 5
            }
          },
          {
            "label": "Content, this is more curiosity",
            "score": {
              "push": 0
            }
          }
        ]
      },
      {
        "text": "How soon do you actually want to relocate, not just someday?",
        "options": [
          {
            "label": "Within 6 months",
            "score": {
              "readiness": 10
            }
          },
          {
            "label": "Within a year",
            "score": {
              "readiness": 5
            }
          },
          {
            "label": "Just exploring for now",
            "score": {
              "readiness": 0
            }
          }
        ]
      },
      {
        "text": "Do you already have qualifications or job offers lined up?",
        "options": [
          {
            "label": "Yes",
            "score": {
              "goals": 10,
              "readiness": 10
            }
          },
          {
            "label": "In progress",
            "score": {
              "goals": 5,
              "readiness": 5
            }
          },
          {
            "label": "Not yet",
            "score": {
              "goals": 0,
              "readiness": 0
            }
          }
        ]
      },
      {
        "text": "What would it mean for you personally if this move actually happened?",
        "options": [
          {
            "label": "A completely different life",
            "score": {
              "push": 10,
              "goals": 10
            }
          },
          {
            "label": "A real improvement",
            "score": {
              "push": 5,
              "goals": 5
            }
          },
          {
            "label": "Still working that out",
            "score": {
              "push": 0,
              "goals": 0
            }
          }
        ]
      },
      {
        "text": "What’s stopped you from committing to a plan so far?",
        "options": [
          {
            "label": "Nothing, I’m ready to move forward",
            "score": {
              "readiness": 10,
              "goals": 10
            }
          },
          {
            "label": "Too many options, hard to choose",
            "score": {
              "readiness": 5,
              "goals": 5
            }
          },
          {
            "label": "Fear of making the wrong choice",
            "score": {
              "readiness": 0,
              "goals": 0
            }
          }
        ]
      },
      {
        "text": "Has someone close to you already made a similar move, and how did that affect you?",
        "options": [
          {
            "label": "Yes, and it made me want this more",
            "score": {
              "push": 10
            }
          },
          {
            "label": "Yes, mixed feelings about it",
            "score": {
              "push": 5
            }
          },
          {
            "label": "No, I don’t know anyone who has",
            "score": {
              "push": 0
            }
          }
        ]
      },
      {
        "text": "What’s the honest state of your savings for a move like this?",
        "options": [
          {
            "label": "Ready, or close to it",
            "score": {
              "readiness": 10
            }
          },
          {
            "label": "Building steadily",
            "score": {
              "readiness": 5
            }
          },
          {
            "label": "Barely started",
            "score": {
              "readiness": 0
            }
          }
        ]
      },
      {
        "text": "How clear are you on which specific country actually fits your goals?",
        "options": [
          {
            "label": "Very clear, I’ve narrowed it down",
            "score": {
              "goals": 10,
              "push": 10
            }
          },
          {
            "label": "A couple of options in mind",
            "score": {
              "goals": 5,
              "push": 5
            }
          },
          {
            "label": "Completely open, no idea yet",
            "score": {
              "goals": 0,
              "push": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Ready to apply"
      },
      {
        "min": 40,
        "label": "Building your case"
      },
      {
        "min": 0,
        "label": "Just starting out"
      }
    ],
    "ctaLabel": "Get your country match",
    "sortOrder": 25
  },
  {
    "slug": "study-abroad-readiness-score",
    "title": "Study Abroad Readiness Score",
    "description": "Qualify student leads by academic profile, budget, and target intake before enrolment advice.",
    "filterCategory": "japa",
    "coverImage": "/covers/study-abroad-readiness-score.svg",
    "intro": "A few honest questions about where you actually are in this journey.",
    "categories": [
      {
        "key": "academics",
        "label": "Academic profile"
      },
      {
        "key": "budget",
        "label": "Budget readiness"
      },
      {
        "key": "anxiety",
        "label": "Application anxiety"
      }
    ],
    "questions": [
      {
        "text": "What’s the thought that scares you most about this whole process?",
        "options": [
          {
            "label": "Not much scares me, I feel prepared",
            "score": {
              "anxiety": 10
            }
          },
          {
            "label": "The paperwork and deadlines",
            "score": {
              "anxiety": 5
            }
          },
          {
            "label": "Being rejected after all this effort",
            "score": {
              "anxiety": 0
            }
          }
        ]
      },
      {
        "text": "What’s your current academic qualification, honestly?",
        "options": [
          {
            "label": "Bachelor’s degree or higher",
            "score": {
              "academics": 10
            }
          },
          {
            "label": "In final year",
            "score": {
              "academics": 5
            }
          },
          {
            "label": "Secondary school",
            "score": {
              "academics": 0
            }
          }
        ]
      },
      {
        "text": "Has anyone you know had their study abroad plans fall through, and how did that affect you?",
        "options": [
          {
            "label": "No, or it didn’t discourage me",
            "score": {
              "anxiety": 10
            }
          },
          {
            "label": "A little, made me more cautious",
            "score": {
              "anxiety": 5
            }
          },
          {
            "label": "Yes, and it worries me a lot",
            "score": {
              "anxiety": 0
            }
          }
        ]
      },
      {
        "text": "Do you actually have funds ready for tuition and living costs?",
        "options": [
          {
            "label": "Fully funded",
            "score": {
              "budget": 10
            }
          },
          {
            "label": "Partially funded",
            "score": {
              "budget": 5
            }
          },
          {
            "label": "Looking for scholarships",
            "score": {
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "What keeps you up at night about the financial side of studying abroad?",
        "options": [
          {
            "label": "Nothing, I’m financially prepared",
            "score": {
              "budget": 10
            }
          },
          {
            "label": "Some anxiety about covering everything",
            "score": {
              "budget": 5
            }
          },
          {
            "label": "Real stress about whether it’s enough",
            "score": {
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "Have you taken an English proficiency test (IELTS/TOEFL)?",
        "options": [
          {
            "label": "Yes, passed",
            "score": {
              "academics": 10,
              "budget": 10
            }
          },
          {
            "label": "Booked / preparing",
            "score": {
              "academics": 5,
              "budget": 5
            }
          },
          {
            "label": "Not yet",
            "score": {
              "academics": 0,
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "How confident are you that your academic profile is strong enough for your target schools?",
        "options": [
          {
            "label": "Very confident",
            "score": {
              "academics": 10,
              "anxiety": 10
            }
          },
          {
            "label": "Somewhat, with some doubts",
            "score": {
              "academics": 5,
              "anxiety": 5
            }
          },
          {
            "label": "Honestly not confident at all",
            "score": {
              "academics": 0,
              "anxiety": 0
            }
          }
        ]
      },
      {
        "text": "What’s the real reason you haven’t submitted an application yet, if you haven’t?",
        "options": [
          {
            "label": "I have, or I’m fully ready to",
            "score": {
              "anxiety": 10,
              "academics": 10
            }
          },
          {
            "label": "Still gathering documents",
            "score": {
              "anxiety": 5,
              "academics": 5
            }
          },
          {
            "label": "Honestly, fear of getting it wrong",
            "score": {
              "anxiety": 0,
              "academics": 0
            }
          }
        ]
      },
      {
        "text": "What would this opportunity actually mean for your life if it worked out?",
        "options": [
          {
            "label": "A genuinely life-changing shift",
            "score": {
              "budget": 10,
              "anxiety": 10
            }
          },
          {
            "label": "A big step forward",
            "score": {
              "budget": 5,
              "anxiety": 5
            }
          },
          {
            "label": "Still figuring that out",
            "score": {
              "budget": 0,
              "anxiety": 0
            }
          }
        ]
      },
      {
        "text": "How does your family feel about this plan, and does that add pressure?",
        "options": [
          {
            "label": "Fully supportive, no added pressure",
            "score": {
              "anxiety": 10
            }
          },
          {
            "label": "Supportive but it adds some weight",
            "score": {
              "anxiety": 5
            }
          },
          {
            "label": "A source of real stress",
            "score": {
              "anxiety": 0
            }
          }
        ]
      },
      {
        "text": "When you picture the day you get your acceptance letter, how does it feel?",
        "options": [
          {
            "label": "I can vividly picture it — I’m ready",
            "score": {
              "academics": 10,
              "budget": 10
            }
          },
          {
            "label": "Exciting but I haven’t let myself imagine it fully",
            "score": {
              "academics": 5,
              "budget": 5
            }
          },
          {
            "label": "Hard to picture, honestly",
            "score": {
              "academics": 0,
              "budget": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Application-ready"
      },
      {
        "min": 40,
        "label": "Preparing well"
      },
      {
        "min": 0,
        "label": "Early planning"
      }
    ],
    "ctaLabel": "Book a free counselling session",
    "sortOrder": 26
  },
  {
    "slug": "car-buyer-readiness-scorecard",
    "title": "Car Buyer Readiness Scorecard",
    "description": "Qualify buyers by budget, financing needs, and timeline before a showroom visit.",
    "filterCategory": "auto",
    "coverImage": "/covers/car-buyer-readiness-scorecard.svg",
    "intro": "A few honest questions about what’s actually driving this purchase.",
    "categories": [
      {
        "key": "budget",
        "label": "Budget"
      },
      {
        "key": "timeline",
        "label": "Timeline"
      },
      {
        "key": "frustration",
        "label": "Current vehicle frustration"
      }
    ],
    "questions": [
      {
        "text": "What’s actually going wrong with your current situation that’s pushing you to buy?",
        "options": [
          {
            "label": "My current car is unreliable or breaking down",
            "score": {
              "frustration": 10,
              "timeline": 10
            }
          },
          {
            "label": "It’s fine, I just want something better",
            "score": {
              "frustration": 5,
              "timeline": 5
            }
          },
          {
            "label": "Nothing wrong, just browsing",
            "score": {
              "frustration": 0,
              "timeline": 0
            }
          }
        ]
      },
      {
        "text": "What’s your honest budget for this vehicle?",
        "options": [
          {
            "label": "Over ₦15,000,000",
            "score": {
              "budget": 10
            }
          },
          {
            "label": "₦5,000,000 – ₦15,000,000",
            "score": {
              "budget": 5
            }
          },
          {
            "label": "Under ₦5,000,000",
            "score": {
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "Has your current car ever left you stranded or embarrassed?",
        "options": [
          {
            "label": "Yes, more than once",
            "score": {
              "frustration": 10
            }
          },
          {
            "label": "Once, and it stuck with me",
            "score": {
              "frustration": 5
            }
          },
          {
            "label": "No, it’s been fine",
            "score": {
              "frustration": 0
            }
          }
        ]
      },
      {
        "text": "When are you actually looking to buy, not just someday?",
        "options": [
          {
            "label": "Within a month",
            "score": {
              "timeline": 10
            }
          },
          {
            "label": "1–3 months",
            "score": {
              "timeline": 5
            }
          },
          {
            "label": "Just browsing for now",
            "score": {
              "timeline": 0
            }
          }
        ]
      },
      {
        "text": "Will you be paying cash or financing?",
        "options": [
          {
            "label": "Cash, ready now",
            "score": {
              "budget": 10,
              "timeline": 10
            }
          },
          {
            "label": "Financing, pre-approved",
            "score": {
              "budget": 5,
              "timeline": 5
            }
          },
          {
            "label": "Still arranging financing",
            "score": {
              "budget": 0,
              "timeline": 0
            }
          }
        ]
      },
      {
        "text": "What would it mean for you to finally drive something you’re proud of?",
        "options": [
          {
            "label": "A real confidence boost",
            "score": {
              "frustration": 10,
              "budget": 10
            }
          },
          {
            "label": "Nice, not a big deal",
            "score": {
              "frustration": 5,
              "budget": 5
            }
          },
          {
            "label": "Not something I think about much",
            "score": {
              "frustration": 0,
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "What’s stopped you from making this move sooner?",
        "options": [
          {
            "label": "Nothing — just hadn’t found the right one yet",
            "score": {
              "budget": 10,
              "timeline": 10
            }
          },
          {
            "label": "Still saving up",
            "score": {
              "budget": 5,
              "timeline": 5
            }
          },
          {
            "label": "Kept putting it off",
            "score": {
              "budget": 0,
              "timeline": 0
            }
          }
        ]
      },
      {
        "text": "How much does your current vehicle situation affect your day-to-day stress?",
        "options": [
          {
            "label": "Not at all",
            "score": {
              "frustration": 10
            }
          },
          {
            "label": "A little",
            "score": {
              "frustration": 5
            }
          },
          {
            "label": "A lot, honestly",
            "score": {
              "frustration": 0
            }
          }
        ]
      },
      {
        "text": "Is anyone else weighing in on this decision with you?",
        "options": [
          {
            "label": "No, it’s entirely my call",
            "score": {
              "timeline": 10
            }
          },
          {
            "label": "Yes, but we’re aligned",
            "score": {
              "timeline": 5
            }
          },
          {
            "label": "Yes, and we haven’t agreed yet",
            "score": {
              "timeline": 0
            }
          }
        ]
      },
      {
        "text": "What’s the honest state of your finances for a purchase like this right now?",
        "options": [
          {
            "label": "Solid, I could move today",
            "score": {
              "budget": 10
            }
          },
          {
            "label": "Getting there",
            "score": {
              "budget": 5
            }
          },
          {
            "label": "Not quite ready",
            "score": {
              "budget": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Ready to buy"
      },
      {
        "min": 40,
        "label": "Getting close"
      },
      {
        "min": 0,
        "label": "Just browsing"
      }
    ],
    "ctaLabel": "Book a showroom visit",
    "sortOrder": 27
  },
  {
    "slug": "which-car-fits-your-budget-and-lifestyle",
    "title": "Which Car Fits Your Budget & Lifestyle?",
    "description": "A model-match quiz that routes serious buyers straight to the right listing.",
    "filterCategory": "auto",
    "coverImage": "/covers/which-car-fits-your-budget-and-lifestyle.svg",
    "intro": "A few honest questions about what your daily life actually demands from a car.",
    "categories": [
      {
        "key": "usage",
        "label": "Usage needs"
      },
      {
        "key": "budget",
        "label": "Budget fit"
      },
      {
        "key": "reliability",
        "label": "Reliability need"
      }
    ],
    "questions": [
      {
        "text": "What actually goes wrong most often in your current vehicle situation?",
        "options": [
          {
            "label": "Nothing, I don’t have recurring issues",
            "score": {
              "reliability": 10
            }
          },
          {
            "label": "Occasional small annoyances",
            "score": {
              "reliability": 5
            }
          },
          {
            "label": "Something that regularly lets me down",
            "score": {
              "reliability": 0
            }
          }
        ]
      },
      {
        "text": "What will you honestly use the car for most?",
        "options": [
          {
            "label": "Family / everyday driving",
            "score": {
              "usage": 10
            }
          },
          {
            "label": "Business / long distance",
            "score": {
              "usage": 7
            }
          },
          {
            "label": "Just getting around town",
            "score": {
              "usage": 5
            }
          }
        ]
      },
      {
        "text": "Has a breakdown or unreliable car ever cost you something important — a meeting, a trip, peace of mind?",
        "options": [
          {
            "label": "No, never",
            "score": {
              "reliability": 10
            }
          },
          {
            "label": "Once or twice",
            "score": {
              "reliability": 5
            }
          },
          {
            "label": "Yes, more than I’d like",
            "score": {
              "reliability": 0
            }
          }
        ]
      },
      {
        "text": "What’s your comfortable price range, honestly?",
        "options": [
          {
            "label": "Premium",
            "score": {
              "budget": 10
            }
          },
          {
            "label": "Mid-range",
            "score": {
              "budget": 5
            }
          },
          {
            "label": "Budget-friendly",
            "score": {
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "New or fairly used (Tokunbo) — and what’s driving that preference?",
        "options": [
          {
            "label": "New — I want reliability I can trust",
            "score": {
              "usage": 10,
              "budget": 10
            }
          },
          {
            "label": "Foreign used — a balance that works for me",
            "score": {
              "usage": 5,
              "budget": 5
            }
          },
          {
            "label": "Either works, I’m flexible",
            "score": {
              "usage": 0,
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "How does it feel getting behind the wheel of your current car?",
        "options": [
          {
            "label": "Confident and comfortable",
            "score": {
              "reliability": 10,
              "usage": 10
            }
          },
          {
            "label": "Fine, nothing special",
            "score": {
              "reliability": 5,
              "usage": 5
            }
          },
          {
            "label": "Honestly a bit anxious",
            "score": {
              "reliability": 0,
              "usage": 0
            }
          }
        ]
      },
      {
        "text": "What would the right car actually change about your daily routine?",
        "options": [
          {
            "label": "A lot — less stress, more reliability",
            "score": {
              "usage": 10,
              "reliability": 10
            }
          },
          {
            "label": "Some improvement",
            "score": {
              "usage": 5,
              "reliability": 5
            }
          },
          {
            "label": "Not much, honestly",
            "score": {
              "usage": 0,
              "reliability": 0
            }
          }
        ]
      },
      {
        "text": "Who else rides with you regularly, and how does that shape what you actually need?",
        "options": [
          {
            "label": "Family or a full car, space matters a lot",
            "score": {
              "usage": 10
            }
          },
          {
            "label": "Occasionally, some flexibility needed",
            "score": {
              "usage": 5
            }
          },
          {
            "label": "Mostly just me",
            "score": {
              "usage": 0
            }
          }
        ]
      },
      {
        "text": "What’s the real reason you haven’t upgraded before now?",
        "options": [
          {
            "label": "Just hadn’t found the right match yet",
            "score": {
              "budget": 10,
              "reliability": 10
            }
          },
          {
            "label": "Still saving toward it",
            "score": {
              "budget": 5,
              "reliability": 5
            }
          },
          {
            "label": "Worried about making the wrong choice",
            "score": {
              "budget": 0,
              "reliability": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Strong match found"
      },
      {
        "min": 40,
        "label": "A few good options"
      },
      {
        "min": 0,
        "label": "Let’s narrow it down"
      }
    ],
    "ctaLabel": "See your matched vehicles",
    "sortOrder": 28
  },
  {
    "slug": "auto-loan-pre-qualification",
    "title": "Auto Loan Pre-Qualification",
    "description": "Pre-qualify financing leads on income and down payment before a credit check.",
    "filterCategory": "auto",
    "coverImage": "/covers/auto-loan-pre-qualification.svg",
    "intro": "A few honest questions about where your finances actually stand.",
    "categories": [
      {
        "key": "income",
        "label": "Income stability"
      },
      {
        "key": "downpayment",
        "label": "Down payment"
      },
      {
        "key": "worry",
        "label": "Financial worry"
      }
    ],
    "questions": [
      {
        "text": "How do you feel about your income when you think about taking on a loan?",
        "options": [
          {
            "label": "Confident, it’s steady and reliable",
            "score": {
              "worry": 10,
              "income": 10
            }
          },
          {
            "label": "A bit uncertain, but manageable",
            "score": {
              "worry": 5,
              "income": 5
            }
          },
          {
            "label": "Genuinely worried about it",
            "score": {
              "worry": 0,
              "income": 0
            }
          }
        ]
      },
      {
        "text": "What’s your honest employment situation?",
        "options": [
          {
            "label": "Salaried, full-time",
            "score": {
              "income": 10
            }
          },
          {
            "label": "Self-employed / business owner",
            "score": {
              "income": 5
            }
          },
          {
            "label": "Irregular income",
            "score": {
              "income": 0
            }
          }
        ]
      },
      {
        "text": "Has money ever been tight enough that a loan payment would genuinely worry you?",
        "options": [
          {
            "label": "No, I have a solid buffer",
            "score": {
              "worry": 10
            }
          },
          {
            "label": "Occasionally, some months are tighter",
            "score": {
              "worry": 5
            }
          },
          {
            "label": "Yes, that’s a real concern for me",
            "score": {
              "worry": 0
            }
          }
        ]
      },
      {
        "text": "How much can you honestly put down upfront, right now?",
        "options": [
          {
            "label": "30% or more",
            "score": {
              "downpayment": 10
            }
          },
          {
            "label": "10–30%",
            "score": {
              "downpayment": 5
            }
          },
          {
            "label": "Less than 10%",
            "score": {
              "downpayment": 0
            }
          }
        ]
      },
      {
        "text": "Has a past loan or credit application ever left you feeling anxious or rejected?",
        "options": [
          {
            "label": "No, or I felt confident about it",
            "score": {
              "worry": 10,
              "downpayment": 10
            }
          },
          {
            "label": "A little uncertain, but it worked out",
            "score": {
              "worry": 5,
              "downpayment": 5
            }
          },
          {
            "label": "Yes, and it still worries me",
            "score": {
              "worry": 0,
              "downpayment": 0
            }
          }
        ]
      },
      {
        "text": "Do you have an existing loan or credit history?",
        "options": [
          {
            "label": "Yes, good standing",
            "score": {
              "income": 10,
              "downpayment": 10
            }
          },
          {
            "label": "Limited history",
            "score": {
              "income": 5,
              "downpayment": 5
            }
          },
          {
            "label": "No credit history",
            "score": {
              "income": 0,
              "downpayment": 0
            }
          }
        ]
      },
      {
        "text": "What would it mean for you to drive away knowing the payments are truly manageable?",
        "options": [
          {
            "label": "A real peace of mind",
            "score": {
              "worry": 10,
              "income": 10
            }
          },
          {
            "label": "It would help",
            "score": {
              "worry": 5,
              "income": 5
            }
          },
          {
            "label": "Not something I think much about",
            "score": {
              "worry": 0,
              "income": 0
            }
          }
        ]
      },
      {
        "text": "What’s the honest reason a loan hasn’t felt possible for you until now?",
        "options": [
          {
            "label": "It has, I’m just exploring options",
            "score": {
              "downpayment": 10,
              "income": 10
            }
          },
          {
            "label": "Still building up savings",
            "score": {
              "downpayment": 5,
              "income": 5
            }
          },
          {
            "label": "Worried about being turned down",
            "score": {
              "downpayment": 0,
              "income": 0
            }
          }
        ]
      },
      {
        "text": "Is anyone co-signing or supporting this decision with you?",
        "options": [
          {
            "label": "No, this is on me alone and I’m ready",
            "score": {
              "income": 10,
              "worry": 10
            }
          },
          {
            "label": "Yes, and that gives me confidence",
            "score": {
              "income": 5,
              "worry": 5
            }
          },
          {
            "label": "Not sure yet who else might be involved",
            "score": {
              "income": 0,
              "worry": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Likely to qualify"
      },
      {
        "min": 40,
        "label": "May need a co-signer"
      },
      {
        "min": 0,
        "label": "Needs review"
      }
    ],
    "ctaLabel": "Start your application",
    "sortOrder": 29
  },
  {
    "slug": "wedding-vendor-fit-quiz",
    "title": "Wedding Vendor Fit Quiz",
    "description": "Match couples to the right photographer, caterer, or decorator package automatically.",
    "filterCategory": "weddings",
    "coverImage": "/covers/wedding-vendor-fit-quiz.svg",
    "intro": "A few honest questions about what actually matters to you on the big day.",
    "categories": [
      {
        "key": "budget",
        "label": "Budget"
      },
      {
        "key": "style",
        "label": "Style fit"
      },
      {
        "key": "stress",
        "label": "Planning stress"
      }
    ],
    "questions": [
      {
        "text": "What’s the part of wedding planning that’s actually stressing you out most?",
        "options": [
          {
            "label": "Nothing much, it’s been smooth so far",
            "score": {
              "stress": 10
            }
          },
          {
            "label": "Coordinating everyone and everything",
            "score": {
              "stress": 5
            }
          },
          {
            "label": "Honestly, most of it feels overwhelming",
            "score": {
              "stress": 0
            }
          }
        ]
      },
      {
        "text": "What’s your overall vendor budget, honestly?",
        "options": [
          {
            "label": "Premium",
            "score": {
              "budget": 10
            }
          },
          {
            "label": "Mid-range",
            "score": {
              "budget": 5
            }
          },
          {
            "label": "Budget-conscious",
            "score": {
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "Has a vendor ever let you down or ghosted you during planning?",
        "options": [
          {
            "label": "No, hasn’t happened",
            "score": {
              "stress": 10,
              "budget": 5
            }
          },
          {
            "label": "A small scare, but resolved",
            "score": {
              "stress": 5,
              "budget": 5
            }
          },
          {
            "label": "Yes, and it really threw us off",
            "score": {
              "stress": 0,
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "What style are you actually going for, deep down?",
        "options": [
          {
            "label": "Luxury / grand",
            "score": {
              "style": 10
            }
          },
          {
            "label": "Classic / traditional",
            "score": {
              "style": 5
            }
          },
          {
            "label": "Intimate / minimalist",
            "score": {
              "style": 0
            }
          }
        ]
      },
      {
        "text": "How soon is your wedding date, and how does that timeline feel?",
        "options": [
          {
            "label": "Within 6 months — feels tight but exciting",
            "score": {
              "budget": 10,
              "style": 10,
              "stress": 5
            }
          },
          {
            "label": "6–12 months — comfortable pace",
            "score": {
              "budget": 5,
              "style": 5,
              "stress": 10
            }
          },
          {
            "label": "Over a year away — no pressure yet",
            "score": {
              "budget": 0,
              "style": 0,
              "stress": 10
            }
          }
        ]
      },
      {
        "text": "What would it mean for you to have this handled by people you can actually trust?",
        "options": [
          {
            "label": "Everything — that peace of mind matters most",
            "score": {
              "stress": 10,
              "style": 10
            }
          },
          {
            "label": "It would help a lot",
            "score": {
              "stress": 5,
              "style": 5
            }
          },
          {
            "label": "Not a major factor for us",
            "score": {
              "stress": 0,
              "style": 0
            }
          }
        ]
      },
      {
        "text": "Who else has a strong say in these vendor decisions?",
        "options": [
          {
            "label": "Just us, we decide together easily",
            "score": {
              "style": 10
            }
          },
          {
            "label": "Family input, mostly aligned",
            "score": {
              "style": 5
            }
          },
          {
            "label": "Several voices, and it gets complicated",
            "score": {
              "style": 0
            }
          }
        ]
      },
      {
        "text": "How does it feel imagining the day if every vendor comes through perfectly?",
        "options": [
          {
            "label": "That’s exactly the picture I have in mind",
            "score": {
              "style": 10,
              "stress": 10
            }
          },
          {
            "label": "Good, though I’m trying not to overthink it",
            "score": {
              "style": 5,
              "stress": 5
            }
          },
          {
            "label": "Hard to picture with so much uncertainty right now",
            "score": {
              "style": 0,
              "stress": 0
            }
          }
        ]
      },
      {
        "text": "What’s the one detail you’d be most devastated to get wrong?",
        "options": [
          {
            "label": "Nothing specific — I’m fairly relaxed about it",
            "score": {
              "stress": 10
            }
          },
          {
            "label": "A couple of things I really care about",
            "score": {
              "stress": 5
            }
          },
          {
            "label": "Honestly, several things weigh on me",
            "score": {
              "stress": 0
            }
          }
        ]
      },
      {
        "text": "Have you already been quoted prices that surprised you?",
        "options": [
          {
            "label": "No, budget has tracked as expected",
            "score": {
              "budget": 10
            }
          },
          {
            "label": "A little higher than planned",
            "score": {
              "budget": 5
            }
          },
          {
            "label": "Yes, significantly more than expected",
            "score": {
              "budget": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Ready to book"
      },
      {
        "min": 40,
        "label": "Planning in progress"
      },
      {
        "min": 0,
        "label": "Early planning"
      }
    ],
    "ctaLabel": "See matched vendors",
    "sortOrder": 30
  },
  {
    "slug": "wedding-budget-and-readiness-planner",
    "title": "Wedding Budget & Readiness Planner",
    "description": "Qualify serious couples by date, guest count, and budget before a planning call.",
    "filterCategory": "weddings",
    "coverImage": "/covers/wedding-budget-and-readiness-planner.svg",
    "intro": "A few honest questions about how planning has actually been feeling so far.",
    "categories": [
      {
        "key": "budget",
        "label": "Budget clarity"
      },
      {
        "key": "planning",
        "label": "Planning progress"
      },
      {
        "key": "overwhelm",
        "label": "Planning overwhelm"
      }
    ],
    "questions": [
      {
        "text": "What’s the honest state of mind right now when you think about the wedding?",
        "options": [
          {
            "label": "Excited, feeling on top of it",
            "score": {
              "overwhelm": 10
            }
          },
          {
            "label": "A mix of excitement and stress",
            "score": {
              "overwhelm": 5
            }
          },
          {
            "label": "Overwhelmed, if I’m honest",
            "score": {
              "overwhelm": 0
            }
          }
        ]
      },
      {
        "text": "Do you actually have a set wedding budget, or a hopeful number?",
        "options": [
          {
            "label": "Yes, confirmed and realistic",
            "score": {
              "budget": 10
            }
          },
          {
            "label": "Rough estimate",
            "score": {
              "budget": 5
            }
          },
          {
            "label": "Not yet",
            "score": {
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "Has anything about the budget already surprised or worried you?",
        "options": [
          {
            "label": "No, things have tracked as expected",
            "score": {
              "budget": 10,
              "overwhelm": 10
            }
          },
          {
            "label": "A little, some costs crept up",
            "score": {
              "budget": 5,
              "overwhelm": 5
            }
          },
          {
            "label": "Yes, it’s been a real source of stress",
            "score": {
              "budget": 0,
              "overwhelm": 0
            }
          }
        ]
      },
      {
        "text": "Roughly how many guests are you actually expecting?",
        "options": [
          {
            "label": "200+",
            "score": {
              "planning": 10
            }
          },
          {
            "label": "50–200",
            "score": {
              "planning": 5
            }
          },
          {
            "label": "Under 50",
            "score": {
              "planning": 0
            }
          }
        ]
      },
      {
        "text": "What’s the thing on your to-do list you keep avoiding?",
        "options": [
          {
            "label": "Nothing, I’m on top of the list",
            "score": {
              "planning": 10,
              "overwhelm": 10
            }
          },
          {
            "label": "One or two tasks I keep pushing back",
            "score": {
              "planning": 5,
              "overwhelm": 5
            }
          },
          {
            "label": "Honestly, most of it feels like too much",
            "score": {
              "planning": 0,
              "overwhelm": 0
            }
          }
        ]
      },
      {
        "text": "Have you booked a venue yet?",
        "options": [
          {
            "label": "Yes",
            "score": {
              "budget": 10,
              "planning": 10
            }
          },
          {
            "label": "Shortlisting",
            "score": {
              "budget": 5,
              "planning": 5
            }
          },
          {
            "label": "Not yet",
            "score": {
              "budget": 0,
              "planning": 0
            }
          }
        ]
      },
      {
        "text": "How does it feel when family members weigh in on the plans?",
        "options": [
          {
            "label": "Helpful, we’re mostly aligned",
            "score": {
              "overwhelm": 10
            }
          },
          {
            "label": "A bit of friction sometimes",
            "score": {
              "overwhelm": 5
            }
          },
          {
            "label": "Genuinely stressful at times",
            "score": {
              "overwhelm": 0
            }
          }
        ]
      },
      {
        "text": "What would it mean for you to hand off even part of this planning to someone else?",
        "options": [
          {
            "label": "A real relief, honestly",
            "score": {
              "overwhelm": 10,
              "planning": 10
            }
          },
          {
            "label": "It would help",
            "score": {
              "overwhelm": 5,
              "planning": 5
            }
          },
          {
            "label": "We enjoy planning it ourselves",
            "score": {
              "overwhelm": 0,
              "planning": 0
            }
          }
        ]
      },
      {
        "text": "Have you had a moment where you thought \"this is more complicated than I expected\"?",
        "options": [
          {
            "label": "No, it’s gone smoothly",
            "score": {
              "overwhelm": 10,
              "planning": 10
            }
          },
          {
            "label": "Once or twice",
            "score": {
              "overwhelm": 5,
              "planning": 5
            }
          },
          {
            "label": "More often than I expected",
            "score": {
              "overwhelm": 0,
              "planning": 0
            }
          }
        ]
      },
      {
        "text": "What’s stopped you from locking in the big decisions so far?",
        "options": [
          {
            "label": "Nothing, most are already locked in",
            "score": {
              "planning": 10,
              "budget": 10
            }
          },
          {
            "label": "Still comparing options",
            "score": {
              "planning": 5,
              "budget": 5
            }
          },
          {
            "label": "Hard to agree on things",
            "score": {
              "planning": 0,
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "How much time do you actually have left before the date versus what’s left to do?",
        "options": [
          {
            "label": "Plenty of time, we’re ahead of schedule",
            "score": {
              "planning": 10
            }
          },
          {
            "label": "It’s tight but doable",
            "score": {
              "planning": 5
            }
          },
          {
            "label": "Honestly, we’re behind",
            "score": {
              "planning": 0
            }
          }
        ]
      },
      {
        "text": "Have you lost sleep over any part of this planning process?",
        "options": [
          {
            "label": "No, not really",
            "score": {
              "overwhelm": 10
            }
          },
          {
            "label": "Once or twice",
            "score": {
              "overwhelm": 5
            }
          },
          {
            "label": "More nights than I’d like to admit",
            "score": {
              "overwhelm": 0
            }
          }
        ]
      },
      {
        "text": "What would peace of mind about this budget actually be worth to you right now?",
        "options": [
          {
            "label": "A lot — I’d pay for that certainty",
            "score": {
              "budget": 10,
              "overwhelm": 10
            }
          },
          {
            "label": "Something, within reason",
            "score": {
              "budget": 5,
              "overwhelm": 5
            }
          },
          {
            "label": "We’re not too worried about it",
            "score": {
              "budget": 0,
              "overwhelm": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Ready to plan"
      },
      {
        "min": 40,
        "label": "Getting organised"
      },
      {
        "min": 0,
        "label": "Just starting"
      }
    ],
    "ctaLabel": "Book a planning call",
    "sortOrder": 31
  },
  {
    "slug": "venue-booking-qualifier",
    "title": "Venue Booking Qualifier",
    "description": "Filter venue enquiries by date, capacity, and budget before a site tour.",
    "filterCategory": "weddings",
    "coverImage": "/covers/venue-booking-qualifier.svg",
    "intro": "A few honest questions about what’s actually made venue-hunting stressful.",
    "categories": [
      {
        "key": "capacity",
        "label": "Guest capacity"
      },
      {
        "key": "budget",
        "label": "Budget fit"
      },
      {
        "key": "frustration",
        "label": "Search frustration"
      }
    ],
    "questions": [
      {
        "text": "What’s actually been the most frustrating part of the venue search so far?",
        "options": [
          {
            "label": "Nothing really, still early days",
            "score": {
              "frustration": 10
            }
          },
          {
            "label": "Everywhere we like is out of budget",
            "score": {
              "frustration": 5
            }
          },
          {
            "label": "Everything — it’s been genuinely stressful",
            "score": {
              "frustration": 0
            }
          }
        ]
      },
      {
        "text": "How many guests do you actually need the venue to hold?",
        "options": [
          {
            "label": "300+",
            "score": {
              "capacity": 10
            }
          },
          {
            "label": "100–300",
            "score": {
              "capacity": 5
            }
          },
          {
            "label": "Under 100",
            "score": {
              "capacity": 0
            }
          }
        ]
      },
      {
        "text": "Has a venue ever fallen through on you, or come close to it?",
        "options": [
          {
            "label": "No, hasn’t happened",
            "score": {
              "frustration": 10,
              "capacity": 5
            }
          },
          {
            "label": "A close call once",
            "score": {
              "frustration": 5,
              "capacity": 5
            }
          },
          {
            "label": "Yes, and it was stressful",
            "score": {
              "frustration": 0,
              "capacity": 0
            }
          }
        ]
      },
      {
        "text": "What’s your honest venue budget?",
        "options": [
          {
            "label": "Premium",
            "score": {
              "budget": 10
            }
          },
          {
            "label": "Mid-range",
            "score": {
              "budget": 5
            }
          },
          {
            "label": "Budget-friendly",
            "score": {
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "Is your date fixed, or are you flexible?",
        "options": [
          {
            "label": "Fixed date",
            "score": {
              "capacity": 10,
              "budget": 10
            }
          },
          {
            "label": "Somewhat flexible",
            "score": {
              "capacity": 5,
              "budget": 5
            }
          },
          {
            "label": "Very flexible",
            "score": {
              "capacity": 0,
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "How would it feel to finally lock in the venue and cross it off the list?",
        "options": [
          {
            "label": "A huge relief, honestly",
            "score": {
              "frustration": 10,
              "budget": 10
            }
          },
          {
            "label": "Good, one less thing to worry about",
            "score": {
              "frustration": 5,
              "budget": 5
            }
          },
          {
            "label": "We’re enjoying the search, no rush",
            "score": {
              "frustration": 0,
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "What’s the real reason nothing’s been booked yet?",
        "options": [
          {
            "label": "Just hasn’t found the perfect fit yet",
            "score": {
              "capacity": 10,
              "budget": 10
            }
          },
          {
            "label": "Comparing a few final options",
            "score": {
              "capacity": 5,
              "budget": 5
            }
          },
          {
            "label": "Budget and space keep clashing",
            "score": {
              "capacity": 0,
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "How many venues have you already toured or seriously considered?",
        "options": [
          {
            "label": "Several — we know exactly what we want",
            "score": {
              "capacity": 10,
              "frustration": 10
            }
          },
          {
            "label": "A couple, still narrowing down",
            "score": {
              "capacity": 5,
              "frustration": 5
            }
          },
          {
            "label": "None yet, still researching online",
            "score": {
              "capacity": 0,
              "frustration": 0
            }
          }
        ]
      },
      {
        "text": "Is anyone else’s approval needed before you can commit to a venue?",
        "options": [
          {
            "label": "No, we decide together and move fast",
            "score": {
              "budget": 10
            }
          },
          {
            "label": "Yes, but we’re usually aligned",
            "score": {
              "budget": 5
            }
          },
          {
            "label": "Yes, and it slows things down",
            "score": {
              "budget": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Ready to tour"
      },
      {
        "min": 40,
        "label": "Comparing options"
      },
      {
        "min": 0,
        "label": "Early research"
      }
    ],
    "ctaLabel": "Book a site tour",
    "sortOrder": 32
  },
  {
    "slug": "skin-type-and-product-match-quiz",
    "title": "Skin Type & Product Match Quiz",
    "description": "Recommend the right routine while capturing a fully qualified skincare lead.",
    "filterCategory": "beauty",
    "coverImage": "/covers/skin-type-and-product-match-quiz.svg",
    "intro": "A few honest questions about how your skin actually makes you feel.",
    "categories": [
      {
        "key": "skintype",
        "label": "Skin profile"
      },
      {
        "key": "concern",
        "label": "Primary concern"
      },
      {
        "key": "confidence",
        "label": "Skin confidence"
      }
    ],
    "questions": [
      {
        "text": "What’s the first thing you notice about your skin when you look in the mirror?",
        "options": [
          {
            "label": "Mostly good things, I feel confident",
            "score": {
              "confidence": 10
            }
          },
          {
            "label": "A specific issue I always clock first",
            "score": {
              "confidence": 5
            }
          },
          {
            "label": "Something that bothers me every time",
            "score": {
              "confidence": 0
            }
          }
        ]
      },
      {
        "text": "How would you honestly describe your skin day to day?",
        "options": [
          {
            "label": "Oily / acne-prone",
            "score": {
              "skintype": 10
            }
          },
          {
            "label": "Combination",
            "score": {
              "skintype": 5
            }
          },
          {
            "label": "Dry / sensitive",
            "score": {
              "skintype": 0
            }
          }
        ]
      },
      {
        "text": "Has a skin concern ever made you avoid a photo or event?",
        "options": [
          {
            "label": "No, never held me back",
            "score": {
              "confidence": 10
            }
          },
          {
            "label": "Once or twice",
            "score": {
              "confidence": 5
            }
          },
          {
            "label": "Yes, more than I’d like to admit",
            "score": {
              "confidence": 0
            }
          }
        ]
      },
      {
        "text": "What’s your honest main skin concern right now?",
        "options": [
          {
            "label": "Hyperpigmentation / dark spots",
            "score": {
              "concern": 10
            }
          },
          {
            "label": "Ageing / fine lines",
            "score": {
              "concern": 7
            }
          },
          {
            "label": "Just general maintenance",
            "score": {
              "concern": 0
            }
          }
        ]
      },
      {
        "text": "Have you tried products before that just didn’t work for your skin?",
        "options": [
          {
            "label": "A few, and I’ve learned what works",
            "score": {
              "skintype": 10,
              "concern": 10
            }
          },
          {
            "label": "One or two, mixed results",
            "score": {
              "skintype": 5,
              "concern": 5
            }
          },
          {
            "label": "Many, and nothing has worked",
            "score": {
              "skintype": 0,
              "concern": 0
            }
          }
        ]
      },
      {
        "text": "Do you currently follow a skincare routine, or wing it?",
        "options": [
          {
            "label": "Yes, consistently",
            "score": {
              "skintype": 10,
              "concern": 10
            }
          },
          {
            "label": "Sometimes",
            "score": {
              "skintype": 5,
              "concern": 5
            }
          },
          {
            "label": "No routine yet",
            "score": {
              "skintype": 0,
              "concern": 0
            }
          }
        ]
      },
      {
        "text": "What would it mean for you to finally feel confident going bare-faced?",
        "options": [
          {
            "label": "That’s already how I feel",
            "score": {
              "confidence": 10
            }
          },
          {
            "label": "It would be a nice shift",
            "score": {
              "confidence": 5
            }
          },
          {
            "label": "Honestly hard to imagine right now",
            "score": {
              "confidence": 0
            }
          }
        ]
      },
      {
        "text": "What’s stopped you from getting your skin concern properly sorted before now?",
        "options": [
          {
            "label": "Just hadn’t found the right products yet",
            "score": {
              "concern": 10,
              "skintype": 10
            }
          },
          {
            "label": "Wasn’t sure what my skin actually needed",
            "score": {
              "concern": 5,
              "skintype": 5
            }
          },
          {
            "label": "Tried things and gave up after they didn’t work",
            "score": {
              "concern": 0,
              "skintype": 0
            }
          }
        ]
      },
      {
        "text": "How does your skin react when the weather or your routine changes?",
        "options": [
          {
            "label": "Stays fairly stable",
            "score": {
              "skintype": 10
            }
          },
          {
            "label": "Noticeable but manageable shifts",
            "score": {
              "skintype": 5
            }
          },
          {
            "label": "Reacts badly, unpredictably",
            "score": {
              "skintype": 0
            }
          }
        ]
      },
      {
        "text": "Has anyone ever commented on your skin in a way that stuck with you?",
        "options": [
          {
            "label": "Yes, and it was a compliment",
            "score": {
              "confidence": 10
            }
          },
          {
            "label": "Not really, nothing memorable",
            "score": {
              "confidence": 5
            }
          },
          {
            "label": "Yes, and it hurt more than I let on",
            "score": {
              "confidence": 0
            }
          }
        ]
      },
      {
        "text": "What’s your actual budget for getting your skin sorted properly?",
        "options": [
          {
            "label": "Willing to invest properly",
            "score": {
              "concern": 10,
              "confidence": 10
            }
          },
          {
            "label": "Something reasonable",
            "score": {
              "concern": 5,
              "confidence": 5
            }
          },
          {
            "label": "Looking for budget-friendly options",
            "score": {
              "concern": 0,
              "confidence": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Routine-ready"
      },
      {
        "min": 40,
        "label": "Building a routine"
      },
      {
        "min": 0,
        "label": "Just getting started"
      }
    ],
    "ctaLabel": "Get your product match",
    "sortOrder": 33
  },
  {
    "slug": "which-product-line-is-right-for-you",
    "title": "Which Product Line Is Right For You?",
    "description": "A value-first quiz that leads naturally into a product recommendation.",
    "filterCategory": "beauty",
    "coverImage": "/covers/which-product-line-is-right-for-you.svg",
    "intro": "A few honest questions about what you actually want your skin or look to say about you.",
    "categories": [
      {
        "key": "goals",
        "label": "Beauty goals"
      },
      {
        "key": "budget",
        "label": "Budget"
      },
      {
        "key": "patience",
        "label": "Results patience"
      }
    ],
    "questions": [
      {
        "text": "Have you ever bought a product out of frustration, hoping it would just finally work?",
        "options": [
          {
            "label": "No, I research carefully before buying",
            "score": {
              "patience": 10
            }
          },
          {
            "label": "Once or twice",
            "score": {
              "patience": 5
            }
          },
          {
            "label": "Yes, more than I’d like to admit",
            "score": {
              "patience": 0
            }
          }
        ]
      },
      {
        "text": "What matters most to you in a product line, honestly?",
        "options": [
          {
            "label": "Visible, fast results",
            "score": {
              "goals": 10
            }
          },
          {
            "label": "Gentle, everyday care",
            "score": {
              "goals": 5
            }
          },
          {
            "label": "Not sure yet",
            "score": {
              "goals": 0
            }
          }
        ]
      },
      {
        "text": "How do you feel when a product doesn’t deliver results as fast as hoped?",
        "options": [
          {
            "label": "Patient, I give it time to work",
            "score": {
              "patience": 10
            }
          },
          {
            "label": "A bit anxious, but I stick with it",
            "score": {
              "patience": 5
            }
          },
          {
            "label": "Frustrated, I usually give up quickly",
            "score": {
              "patience": 0
            }
          }
        ]
      },
      {
        "text": "What’s your honest monthly beauty budget?",
        "options": [
          {
            "label": "Premium",
            "score": {
              "budget": 10
            }
          },
          {
            "label": "Mid-range",
            "score": {
              "budget": 5
            }
          },
          {
            "label": "Budget-friendly",
            "score": {
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "Has money spent on products that didn’t work ever bothered you afterward?",
        "options": [
          {
            "label": "No, I don’t dwell on it",
            "score": {
              "budget": 10,
              "goals": 10
            }
          },
          {
            "label": "A little",
            "score": {
              "budget": 5,
              "goals": 5
            }
          },
          {
            "label": "Yes, it really bothers me",
            "score": {
              "budget": 0,
              "goals": 0
            }
          }
        ]
      },
      {
        "text": "Do you prefer local or international brands, and why?",
        "options": [
          {
            "label": "No preference, best fit wins",
            "score": {
              "goals": 10,
              "budget": 10
            }
          },
          {
            "label": "International, trust in the track record",
            "score": {
              "goals": 5,
              "budget": 5
            }
          },
          {
            "label": "Local, prefer supporting closer to home",
            "score": {
              "goals": 0,
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "What would it mean for you to finally find a routine that just works?",
        "options": [
          {
            "label": "A real relief, I’m tired of guessing",
            "score": {
              "goals": 10,
              "patience": 10
            }
          },
          {
            "label": "It would be nice",
            "score": {
              "goals": 5,
              "patience": 5
            }
          },
          {
            "label": "Not a big deal either way",
            "score": {
              "goals": 0,
              "patience": 0
            }
          }
        ]
      },
      {
        "text": "How many different products or brands have you cycled through this year?",
        "options": [
          {
            "label": "One or two, I stick with what works",
            "score": {
              "patience": 10
            }
          },
          {
            "label": "A handful",
            "score": {
              "patience": 5
            }
          },
          {
            "label": "Too many to count",
            "score": {
              "patience": 0
            }
          }
        ]
      },
      {
        "text": "What’s the real reason you haven’t settled on a go-to line yet?",
        "options": [
          {
            "label": "Still exploring what fits me best",
            "score": {
              "goals": 10,
              "budget": 10
            }
          },
          {
            "label": "Budget hasn’t allowed committing fully",
            "score": {
              "goals": 5,
              "budget": 5
            }
          },
          {
            "label": "Nothing has actually delivered results",
            "score": {
              "goals": 0,
              "budget": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Premium fit"
      },
      {
        "min": 40,
        "label": "Mid-tier fit"
      },
      {
        "min": 0,
        "label": "Starter fit"
      }
    ],
    "ctaLabel": "See your product match",
    "sortOrder": 34
  },
  {
    "slug": "brand-campaign-insight-starter",
    "title": "Brand Campaign Insight Starter",
    "description": "Pre-configured with audience-profile capture on, ready for a sponsored brand campaign.",
    "filterCategory": "beauty",
    "coverImage": "/covers/brand-campaign-insight-starter.svg",
    "intro": "A few honest questions — answer for a chance to be featured in our next campaign.",
    "categories": [
      {
        "key": "affinity",
        "label": "Brand affinity"
      },
      {
        "key": "usage",
        "label": "Product usage"
      },
      {
        "key": "story",
        "label": "Personal story"
      }
    ],
    "questions": [
      {
        "text": "What actually made you first try a product like ours?",
        "options": [
          {
            "label": "A specific problem I was trying to solve",
            "score": {
              "story": 10
            }
          },
          {
            "label": "Curiosity, saw it recommended somewhere",
            "score": {
              "story": 5
            }
          },
          {
            "label": "Honestly can’t remember",
            "score": {
              "story": 0
            }
          }
        ]
      },
      {
        "text": "How familiar are you with our brand, really?",
        "options": [
          {
            "label": "I use it regularly",
            "score": {
              "affinity": 10
            }
          },
          {
            "label": "I’ve tried it before",
            "score": {
              "affinity": 5
            }
          },
          {
            "label": "First time hearing about it",
            "score": {
              "affinity": 0
            }
          }
        ]
      },
      {
        "text": "Has a beauty product ever genuinely changed how you feel about yourself?",
        "options": [
          {
            "label": "Yes, and I remember exactly which one",
            "score": {
              "story": 10,
              "affinity": 10
            }
          },
          {
            "label": "A little, nothing dramatic",
            "score": {
              "story": 5,
              "affinity": 5
            }
          },
          {
            "label": "Not really",
            "score": {
              "story": 0,
              "affinity": 0
            }
          }
        ]
      },
      {
        "text": "How often do you actually buy skincare or beauty products?",
        "options": [
          {
            "label": "Monthly",
            "score": {
              "usage": 10
            }
          },
          {
            "label": "Every few months",
            "score": {
              "usage": 5
            }
          },
          {
            "label": "Rarely",
            "score": {
              "usage": 0
            }
          }
        ]
      },
      {
        "text": "Would you actually recommend us to a friend, and why?",
        "options": [
          {
            "label": "Definitely, it’s made a real difference",
            "score": {
              "affinity": 10,
              "usage": 10
            }
          },
          {
            "label": "Maybe, it’s decent",
            "score": {
              "affinity": 5,
              "usage": 5
            }
          },
          {
            "label": "Not sure yet",
            "score": {
              "affinity": 0,
              "usage": 0
            }
          }
        ]
      },
      {
        "text": "What’s the story you’d actually tell if someone asked why you use this brand?",
        "options": [
          {
            "label": "A genuine, specific story I could share",
            "score": {
              "story": 10,
              "usage": 10
            }
          },
          {
            "label": "Something simple, nothing special",
            "score": {
              "story": 5,
              "usage": 5
            }
          },
          {
            "label": "I don’t really have one yet",
            "score": {
              "story": 0,
              "usage": 0
            }
          }
        ]
      },
      {
        "text": "What would it mean to you to be featured in a real campaign?",
        "options": [
          {
            "label": "That would genuinely excite me",
            "score": {
              "affinity": 10,
              "story": 10
            }
          },
          {
            "label": "Fun, but not a big deal",
            "score": {
              "affinity": 5,
              "story": 5
            }
          },
          {
            "label": "Not something I’ve thought about",
            "score": {
              "affinity": 0,
              "story": 0
            }
          }
        ]
      },
      {
        "text": "Has anyone ever asked you for a product recommendation, and what did you say?",
        "options": [
          {
            "label": "Yes, and I confidently pointed them here",
            "score": {
              "affinity": 10,
              "usage": 10
            }
          },
          {
            "label": "Yes, but I wasn’t sure what to say",
            "score": {
              "affinity": 5,
              "usage": 5
            }
          },
          {
            "label": "No one’s asked me yet",
            "score": {
              "affinity": 0,
              "usage": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Brand advocate"
      },
      {
        "min": 40,
        "label": "Engaged customer"
      },
      {
        "min": 0,
        "label": "New to the brand"
      }
    ],
    "ctaLabel": "",
    "sortOrder": 35
  },
  {
    "slug": "security-risk-assessment",
    "title": "Security Risk Assessment",
    "description": "Score a property or business on real risk factors before a site survey.",
    "filterCategory": "security",
    "coverImage": "/covers/security-risk-assessment.svg",
    "intro": "A few honest questions about what actually worries you about this property.",
    "categories": [
      {
        "key": "exposure",
        "label": "Risk exposure"
      },
      {
        "key": "measures",
        "label": "Current measures"
      },
      {
        "key": "fear",
        "label": "Safety anxiety"
      }
    ],
    "questions": [
      {
        "text": "What’s the thought that actually crosses your mind when you leave this property empty?",
        "options": [
          {
            "label": "Not much, I feel it’s secure",
            "score": {
              "fear": 10
            }
          },
          {
            "label": "A little worry, in the back of my mind",
            "score": {
              "fear": 5
            }
          },
          {
            "label": "Real anxiety, I check on it constantly",
            "score": {
              "fear": 0
            }
          }
        ]
      },
      {
        "text": "Has your property experienced any security incidents in the last 2 years?",
        "options": [
          {
            "label": "Yes",
            "score": {
              "exposure": 10
            }
          },
          {
            "label": "Near-misses only",
            "score": {
              "exposure": 5
            }
          },
          {
            "label": "None",
            "score": {
              "exposure": 0
            }
          }
        ]
      },
      {
        "text": "Has a security scare ever kept you up at night?",
        "options": [
          {
            "label": "No, never",
            "score": {
              "fear": 10,
              "exposure": 10
            }
          },
          {
            "label": "Once or twice",
            "score": {
              "fear": 5,
              "exposure": 5
            }
          },
          {
            "label": "Yes, more than I’d like",
            "score": {
              "fear": 0,
              "exposure": 0
            }
          }
        ]
      },
      {
        "text": "What security measures do you honestly have in place right now?",
        "options": [
          {
            "label": "None / minimal",
            "score": {
              "measures": 10
            }
          },
          {
            "label": "Basic (guards or CCTV)",
            "score": {
              "measures": 5
            }
          },
          {
            "label": "Comprehensive",
            "score": {
              "measures": 0
            }
          }
        ]
      },
      {
        "text": "How would you rate the location’s general risk level, honestly?",
        "options": [
          {
            "label": "High-risk area",
            "score": {
              "exposure": 10,
              "measures": 10
            }
          },
          {
            "label": "Moderate",
            "score": {
              "exposure": 5,
              "measures": 5
            }
          },
          {
            "label": "Low-risk area",
            "score": {
              "exposure": 0,
              "measures": 0
            }
          }
        ]
      },
      {
        "text": "Have neighbors or nearby businesses reported incidents recently?",
        "options": [
          {
            "label": "No, quiet area",
            "score": {
              "exposure": 10
            }
          },
          {
            "label": "A couple of things I’ve heard about",
            "score": {
              "exposure": 5
            }
          },
          {
            "label": "Yes, and it worries me",
            "score": {
              "exposure": 0
            }
          }
        ]
      },
      {
        "text": "What would it mean for you to finally feel completely at ease about this property’s safety?",
        "options": [
          {
            "label": "A real, meaningful relief",
            "score": {
              "fear": 10,
              "measures": 10
            }
          },
          {
            "label": "It would help",
            "score": {
              "fear": 5,
              "measures": 5
            }
          },
          {
            "label": "I already feel that way",
            "score": {
              "fear": 0,
              "measures": 0
            }
          }
        ]
      },
      {
        "text": "What’s stopped you from upgrading security before now?",
        "options": [
          {
            "label": "Just hasn’t felt urgent until recently",
            "score": {
              "measures": 10,
              "fear": 10
            }
          },
          {
            "label": "Wasn’t sure what actually made sense",
            "score": {
              "measures": 5,
              "fear": 5
            }
          },
          {
            "label": "Cost has been the main hesitation",
            "score": {
              "measures": 0,
              "fear": 0
            }
          }
        ]
      },
      {
        "text": "Who else is depending on this property being safe — family, staff, tenants?",
        "options": [
          {
            "label": "Several people rely on it",
            "score": {
              "exposure": 10,
              "fear": 10
            }
          },
          {
            "label": "A couple of people",
            "score": {
              "exposure": 5,
              "fear": 5
            }
          },
          {
            "label": "Just myself",
            "score": {
              "exposure": 0,
              "fear": 0
            }
          }
        ]
      },
      {
        "text": "Has valuable property or equipment ever gone missing without explanation?",
        "options": [
          {
            "label": "No, never",
            "score": {
              "exposure": 10
            }
          },
          {
            "label": "A small thing once",
            "score": {
              "exposure": 5
            }
          },
          {
            "label": "Yes, more than once",
            "score": {
              "exposure": 0
            }
          }
        ]
      },
      {
        "text": "How do you feel when you’re away from the property for an extended period?",
        "options": [
          {
            "label": "Relaxed, I trust it’s secure",
            "score": {
              "fear": 10,
              "measures": 10
            }
          },
          {
            "label": "A bit uneasy sometimes",
            "score": {
              "fear": 5,
              "measures": 5
            }
          },
          {
            "label": "Genuinely anxious the whole time",
            "score": {
              "fear": 0,
              "measures": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Urgent need"
      },
      {
        "min": 40,
        "label": "Room to improve"
      },
      {
        "min": 0,
        "label": "Well covered"
      }
    ],
    "ctaLabel": "Book a site survey",
    "sortOrder": 36
  },
  {
    "slug": "which-security-package-fits-your-property",
    "title": "Which Security Package Fits Your Property?",
    "description": "Match residential or corporate leads to the right coverage tier automatically.",
    "filterCategory": "security",
    "coverImage": "/covers/which-security-package-fits-your-property.svg",
    "intro": "A few honest questions about what’s actually driving the need for this.",
    "categories": [
      {
        "key": "scale",
        "label": "Property scale"
      },
      {
        "key": "budget",
        "label": "Budget"
      },
      {
        "key": "concern",
        "label": "Specific concern"
      }
    ],
    "questions": [
      {
        "text": "What’s the specific concern that made you start looking into this?",
        "options": [
          {
            "label": "A real incident or scare recently",
            "score": {
              "concern": 10
            }
          },
          {
            "label": "A general sense I should be more prepared",
            "score": {
              "concern": 5
            }
          },
          {
            "label": "Just being proactive, nothing specific",
            "score": {
              "concern": 0
            }
          }
        ]
      },
      {
        "text": "What type of property is this actually for?",
        "options": [
          {
            "label": "Corporate / commercial site",
            "score": {
              "scale": 10
            }
          },
          {
            "label": "Residential estate",
            "score": {
              "scale": 5
            }
          },
          {
            "label": "Single residence",
            "score": {
              "scale": 0
            }
          }
        ]
      },
      {
        "text": "Has anything happened recently that made this feel urgent?",
        "options": [
          {
            "label": "No, just planning ahead",
            "score": {
              "concern": 10
            }
          },
          {
            "label": "Something small, nothing major",
            "score": {
              "concern": 5
            }
          },
          {
            "label": "Yes, and it really shook me",
            "score": {
              "concern": 0
            }
          }
        ]
      },
      {
        "text": "What’s your honest monthly security budget?",
        "options": [
          {
            "label": "Over ₦500,000",
            "score": {
              "budget": 10
            }
          },
          {
            "label": "₦100,000 – ₦500,000",
            "score": {
              "budget": 5
            }
          },
          {
            "label": "Under ₦100,000",
            "score": {
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "Do you need armed or unarmed personnel, and why does that matter to you?",
        "options": [
          {
            "label": "Armed — the risk feels serious",
            "score": {
              "scale": 10,
              "budget": 10
            }
          },
          {
            "label": "Unarmed — presence is enough",
            "score": {
              "scale": 5,
              "budget": 5
            }
          },
          {
            "label": "Not sure yet",
            "score": {
              "scale": 0,
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "What would it mean for you to finally stop worrying about this property’s safety?",
        "options": [
          {
            "label": "A real relief, that’s exactly why I’m here",
            "score": {
              "concern": 10,
              "budget": 10
            }
          },
          {
            "label": "It would help",
            "score": {
              "concern": 5,
              "budget": 5
            }
          },
          {
            "label": "I don’t worry about it too much already",
            "score": {
              "concern": 0,
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "How many people move through this property regularly?",
        "options": [
          {
            "label": "Large numbers, staff and visitors",
            "score": {
              "scale": 10
            }
          },
          {
            "label": "A moderate, regular flow",
            "score": {
              "scale": 5
            }
          },
          {
            "label": "Just family or a small team",
            "score": {
              "scale": 0
            }
          }
        ]
      },
      {
        "text": "Have you compared providers before, and what put you off?",
        "options": [
          {
            "label": "No, this is a fresh search",
            "score": {
              "budget": 10,
              "concern": 10
            }
          },
          {
            "label": "Yes, but nothing quite fit",
            "score": {
              "budget": 5,
              "concern": 5
            }
          },
          {
            "label": "Yes, and a past provider let me down",
            "score": {
              "budget": 0,
              "concern": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Premium package fit"
      },
      {
        "min": 40,
        "label": "Standard package fit"
      },
      {
        "min": 0,
        "label": "Basic package fit"
      }
    ],
    "ctaLabel": "Get a custom quote",
    "sortOrder": 37
  },
  {
    "slug": "corporate-security-needs-audit",
    "title": "Corporate Security Needs Audit",
    "description": "Qualify B2B security leads by site count, headcount, and current provider.",
    "filterCategory": "security",
    "coverImage": "/covers/corporate-security-needs-audit.svg",
    "intro": "A few honest questions about what’s actually going wrong with security right now.",
    "categories": [
      {
        "key": "scale",
        "label": "Organisation scale"
      },
      {
        "key": "satisfaction",
        "label": "Current provider fit"
      },
      {
        "key": "incident",
        "label": "Recent incident pressure"
      }
    ],
    "questions": [
      {
        "text": "What’s actually prompted this review of your security setup?",
        "options": [
          {
            "label": "A specific incident or near-miss",
            "score": {
              "incident": 10
            }
          },
          {
            "label": "General dissatisfaction building up",
            "score": {
              "incident": 5
            }
          },
          {
            "label": "Just being proactive",
            "score": {
              "incident": 0
            }
          }
        ]
      },
      {
        "text": "How many sites actually need coverage?",
        "options": [
          {
            "label": "5 or more",
            "score": {
              "scale": 10
            }
          },
          {
            "label": "2–4",
            "score": {
              "scale": 5
            }
          },
          {
            "label": "1",
            "score": {
              "scale": 0
            }
          }
        ]
      },
      {
        "text": "Has your current provider ever let you down when it mattered?",
        "options": [
          {
            "label": "No, hasn’t happened",
            "score": {
              "satisfaction": 10,
              "incident": 10
            }
          },
          {
            "label": "A small lapse once",
            "score": {
              "satisfaction": 5,
              "incident": 5
            }
          },
          {
            "label": "Yes, and it was serious",
            "score": {
              "satisfaction": 0,
              "incident": 0
            }
          }
        ]
      },
      {
        "text": "Do you currently have a security provider, and how do you honestly feel about them?",
        "options": [
          {
            "label": "Yes, but unhappy with it",
            "score": {
              "satisfaction": 10
            }
          },
          {
            "label": "Yes, satisfied",
            "score": {
              "satisfaction": 5
            }
          },
          {
            "label": "No provider yet",
            "score": {
              "satisfaction": 0
            }
          }
        ]
      },
      {
        "text": "What would leadership actually say if another incident happened on your watch?",
        "options": [
          {
            "label": "They’d trust I have it handled",
            "score": {
              "incident": 10,
              "satisfaction": 10
            }
          },
          {
            "label": "There’d be some tough questions",
            "score": {
              "incident": 5,
              "satisfaction": 5
            }
          },
          {
            "label": "It would be a serious problem for me",
            "score": {
              "incident": 0,
              "satisfaction": 0
            }
          }
        ]
      },
      {
        "text": "How many staff work across these sites?",
        "options": [
          {
            "label": "200+",
            "score": {
              "scale": 10,
              "satisfaction": 10
            }
          },
          {
            "label": "50–200",
            "score": {
              "scale": 5,
              "satisfaction": 5
            }
          },
          {
            "label": "Under 50",
            "score": {
              "scale": 0,
              "satisfaction": 0
            }
          }
        ]
      },
      {
        "text": "What would it mean for the business to finally have security that just works without oversight?",
        "options": [
          {
            "label": "A real relief for the whole team",
            "score": {
              "satisfaction": 10,
              "scale": 10
            }
          },
          {
            "label": "A meaningful improvement",
            "score": {
              "satisfaction": 5,
              "scale": 5
            }
          },
          {
            "label": "Not something we think about much",
            "score": {
              "satisfaction": 0,
              "scale": 0
            }
          }
        ]
      },
      {
        "text": "How often do you personally have to step in to resolve a security issue?",
        "options": [
          {
            "label": "Rarely, it’s handled well",
            "score": {
              "satisfaction": 10
            }
          },
          {
            "label": "Occasionally",
            "score": {
              "satisfaction": 5
            }
          },
          {
            "label": "More often than I’d like",
            "score": {
              "satisfaction": 0
            }
          }
        ]
      },
      {
        "text": "What’s the real cost to the business if this doesn’t get fixed soon?",
        "options": [
          {
            "label": "Low, not a pressing issue",
            "score": {
              "incident": 0,
              "scale": 0
            }
          },
          {
            "label": "Moderate, growing concern",
            "score": {
              "incident": 5,
              "scale": 5
            }
          },
          {
            "label": "High, real exposure right now",
            "score": {
              "incident": 10,
              "scale": 10
            }
          }
        ]
      },
      {
        "text": "Who ultimately signs off on switching or upgrading a security provider?",
        "options": [
          {
            "label": "Me, directly",
            "score": {
              "satisfaction": 10,
              "scale": 10
            }
          },
          {
            "label": "Me, with approval from someone else",
            "score": {
              "satisfaction": 5,
              "scale": 5
            }
          },
          {
            "label": "Someone else entirely",
            "score": {
              "satisfaction": 0,
              "scale": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "High-value account"
      },
      {
        "min": 40,
        "label": "Solid opportunity"
      },
      {
        "min": 0,
        "label": "Early conversation"
      }
    ],
    "ctaLabel": "Request a proposal",
    "sortOrder": 38
  },
  {
    "slug": "logistics-partner-fit-assessment",
    "title": "Logistics Partner Fit Assessment",
    "description": "Qualify shippers by volume, route, and budget before a rate quote.",
    "filterCategory": "logistics",
    "coverImage": "/covers/logistics-partner-fit-assessment.svg",
    "intro": "A few honest questions about what’s actually going wrong with shipping right now.",
    "categories": [
      {
        "key": "volume",
        "label": "Shipment volume"
      },
      {
        "key": "route",
        "label": "Route complexity"
      },
      {
        "key": "reliability",
        "label": "Delivery reliability"
      }
    ],
    "questions": [
      {
        "text": "What’s actually happened recently that made you start looking for a new logistics partner?",
        "options": [
          {
            "label": "A specific failure — late, lost, or damaged shipment",
            "score": {
              "reliability": 10
            }
          },
          {
            "label": "A building frustration with delays",
            "score": {
              "reliability": 5
            }
          },
          {
            "label": "Nothing specific, just comparing options",
            "score": {
              "reliability": 0
            }
          }
        ]
      },
      {
        "text": "How many shipments do you actually send per month?",
        "options": [
          {
            "label": "50+",
            "score": {
              "volume": 10
            }
          },
          {
            "label": "10–50",
            "score": {
              "volume": 5
            }
          },
          {
            "label": "Under 10",
            "score": {
              "volume": 0
            }
          }
        ]
      },
      {
        "text": "Has a late or lost shipment ever cost you a client or a client’s trust?",
        "options": [
          {
            "label": "No, never happened",
            "score": {
              "reliability": 10,
              "volume": 5
            }
          },
          {
            "label": "A close call once",
            "score": {
              "reliability": 5,
              "volume": 5
            }
          },
          {
            "label": "Yes, and it hurt the relationship",
            "score": {
              "reliability": 0,
              "volume": 0
            }
          }
        ]
      },
      {
        "text": "What kind of routes do you actually need covered?",
        "options": [
          {
            "label": "Multi-state / cross-border",
            "score": {
              "route": 10
            }
          },
          {
            "label": "Regional",
            "score": {
              "route": 5
            }
          },
          {
            "label": "Local / same-city",
            "score": {
              "route": 0
            }
          }
        ]
      },
      {
        "text": "How do you feel every time you have to check up on a shipment’s status?",
        "options": [
          {
            "label": "Confident, tracking is reliable",
            "score": {
              "reliability": 10
            }
          },
          {
            "label": "A bit anxious",
            "score": {
              "reliability": 5
            }
          },
          {
            "label": "Stressed, I have to chase constantly",
            "score": {
              "reliability": 0
            }
          }
        ]
      },
      {
        "text": "Do you currently work with a logistics provider, and how do you honestly feel about them?",
        "options": [
          {
            "label": "Yes, but looking to switch",
            "score": {
              "volume": 10,
              "route": 10
            }
          },
          {
            "label": "Yes, satisfied",
            "score": {
              "volume": 5,
              "route": 5
            }
          },
          {
            "label": "No, first time",
            "score": {
              "volume": 0,
              "route": 0
            }
          }
        ]
      },
      {
        "text": "What would it mean for your business to never worry about a shipment again?",
        "options": [
          {
            "label": "A real weight off my shoulders",
            "score": {
              "reliability": 10,
              "route": 10
            }
          },
          {
            "label": "A meaningful improvement",
            "score": {
              "reliability": 5,
              "route": 5
            }
          },
          {
            "label": "Not something I stress about much",
            "score": {
              "reliability": 0,
              "route": 0
            }
          }
        ]
      },
      {
        "text": "How many client complaints have come in about delivery in the last few months?",
        "options": [
          {
            "label": "None, or barely any",
            "score": {
              "reliability": 10
            }
          },
          {
            "label": "A handful",
            "score": {
              "reliability": 5
            }
          },
          {
            "label": "More than I’d like to admit",
            "score": {
              "reliability": 0
            }
          }
        ]
      },
      {
        "text": "What’s the real reason you haven’t switched providers before now?",
        "options": [
          {
            "label": "Just hadn’t found the right fit yet",
            "score": {
              "volume": 10,
              "route": 10
            }
          },
          {
            "label": "Switching felt like a hassle",
            "score": {
              "volume": 5,
              "route": 5
            }
          },
          {
            "label": "Worried a new provider wouldn’t be better",
            "score": {
              "volume": 0,
              "route": 0
            }
          }
        ]
      },
      {
        "text": "How does an unreliable shipment affect your own reputation with your customers?",
        "options": [
          {
            "label": "Not much, I have a buffer of trust",
            "score": {
              "reliability": 10
            }
          },
          {
            "label": "Some strain, but recoverable",
            "score": {
              "reliability": 5
            }
          },
          {
            "label": "It reflects badly on me directly",
            "score": {
              "reliability": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "High-value shipper"
      },
      {
        "min": 40,
        "label": "Solid opportunity"
      },
      {
        "min": 0,
        "label": "Early conversation"
      }
    ],
    "ctaLabel": "Request a rate quote",
    "sortOrder": 39
  },
  {
    "slug": "fleet-and-freight-needs-audit",
    "title": "Fleet & Freight Needs Audit",
    "description": "Score a business's freight needs before your team pitches a contract.",
    "filterCategory": "logistics",
    "coverImage": "/covers/fleet-and-freight-needs-audit.svg",
    "intro": "A few honest questions about what your current setup is actually costing you.",
    "categories": [
      {
        "key": "scale",
        "label": "Fleet scale"
      },
      {
        "key": "urgency",
        "label": "Contract urgency"
      },
      {
        "key": "strain",
        "label": "Operational strain"
      }
    ],
    "questions": [
      {
        "text": "What’s actually breaking down most often in your current freight setup?",
        "options": [
          {
            "label": "Nothing major, mostly smooth",
            "score": {
              "strain": 10
            }
          },
          {
            "label": "Occasional delays and cost surprises",
            "score": {
              "strain": 5
            }
          },
          {
            "label": "Constant headaches, it’s a real strain",
            "score": {
              "strain": 0
            }
          }
        ]
      },
      {
        "text": "How large is your current fleet or freight need, honestly?",
        "options": [
          {
            "label": "Large-scale / industrial",
            "score": {
              "scale": 10
            }
          },
          {
            "label": "Medium",
            "score": {
              "scale": 5
            }
          },
          {
            "label": "Small / occasional",
            "score": {
              "scale": 0
            }
          }
        ]
      },
      {
        "text": "Has a freight delay or breakdown ever thrown off an important delivery?",
        "options": [
          {
            "label": "No, never happened",
            "score": {
              "strain": 10,
              "urgency": 10
            }
          },
          {
            "label": "Once, and it was stressful",
            "score": {
              "strain": 5,
              "urgency": 5
            }
          },
          {
            "label": "Yes, more than once",
            "score": {
              "strain": 0,
              "urgency": 0
            }
          }
        ]
      },
      {
        "text": "How soon do you actually need a better setup in place?",
        "options": [
          {
            "label": "Immediately",
            "score": {
              "urgency": 10
            }
          },
          {
            "label": "Within 3 months",
            "score": {
              "urgency": 5
            }
          },
          {
            "label": "No rush",
            "score": {
              "urgency": 0
            }
          }
        ]
      },
      {
        "text": "Is your current setup genuinely causing delays or cost overruns?",
        "options": [
          {
            "label": "Yes, significantly",
            "score": {
              "scale": 10,
              "urgency": 10
            }
          },
          {
            "label": "Somewhat",
            "score": {
              "scale": 5,
              "urgency": 5
            }
          },
          {
            "label": "Not really",
            "score": {
              "scale": 0,
              "urgency": 0
            }
          }
        ]
      },
      {
        "text": "What would it mean for your operation to have freight that just runs smoothly?",
        "options": [
          {
            "label": "A significant operational relief",
            "score": {
              "strain": 10,
              "scale": 10
            }
          },
          {
            "label": "A meaningful improvement",
            "score": {
              "strain": 5,
              "scale": 5
            }
          },
          {
            "label": "Not something we stress over much",
            "score": {
              "strain": 0,
              "scale": 0
            }
          }
        ]
      },
      {
        "text": "How often do you personally get pulled in to fix a freight problem?",
        "options": [
          {
            "label": "Rarely, it’s well managed",
            "score": {
              "strain": 10
            }
          },
          {
            "label": "Occasionally",
            "score": {
              "strain": 5
            }
          },
          {
            "label": "Constantly, it’s exhausting",
            "score": {
              "strain": 0
            }
          }
        ]
      },
      {
        "text": "What’s the real cost to the business if this stays unresolved another quarter?",
        "options": [
          {
            "label": "Low, manageable as is",
            "score": {
              "urgency": 0,
              "scale": 0
            }
          },
          {
            "label": "Moderate, growing concern",
            "score": {
              "urgency": 5,
              "scale": 5
            }
          },
          {
            "label": "High, a real problem",
            "score": {
              "urgency": 10,
              "scale": 10
            }
          }
        ]
      },
      {
        "text": "Have you already tried switching providers before, and what happened?",
        "options": [
          {
            "label": "No, this is a fresh search",
            "score": {
              "strain": 10,
              "urgency": 10
            }
          },
          {
            "label": "Yes, mixed results",
            "score": {
              "strain": 5,
              "urgency": 5
            }
          },
          {
            "label": "Yes, and it didn’t fix the problem",
            "score": {
              "strain": 0,
              "urgency": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Priority opportunity"
      },
      {
        "min": 40,
        "label": "Worth pursuing"
      },
      {
        "min": 0,
        "label": "Early stage"
      }
    ],
    "ctaLabel": "Talk to our fleet team",
    "sortOrder": 40
  },
  {
    "slug": "freight-volume-and-route-qualifier",
    "title": "Freight Volume & Route Qualifier",
    "description": "Filter enquiries by shipment size and corridor before dispatch gets involved.",
    "filterCategory": "logistics",
    "coverImage": "/covers/freight-volume-and-route-qualifier.svg",
    "intro": "A few honest questions about what’s actually driving this request.",
    "categories": [
      {
        "key": "volume",
        "label": "Volume"
      },
      {
        "key": "corridor",
        "label": "Corridor fit"
      },
      {
        "key": "trust",
        "label": "Provider trust"
      }
    ],
    "questions": [
      {
        "text": "What’s actually pushed you to look for freight transport right now?",
        "options": [
          {
            "label": "A current provider fell through",
            "score": {
              "trust": 0
            }
          },
          {
            "label": "Growing business need",
            "score": {
              "trust": 10,
              "volume": 5
            }
          },
          {
            "label": "Just comparing rates, nothing urgent",
            "score": {
              "trust": 5,
              "volume": 0
            }
          }
        ]
      },
      {
        "text": "What’s the typical size of your shipments?",
        "options": [
          {
            "label": "Full truckload",
            "score": {
              "volume": 10
            }
          },
          {
            "label": "Partial load",
            "score": {
              "volume": 5
            }
          },
          {
            "label": "Small parcel",
            "score": {
              "volume": 0
            }
          }
        ]
      },
      {
        "text": "Has cargo ever arrived late or damaged in a way that hurt your business?",
        "options": [
          {
            "label": "No, never happened",
            "score": {
              "trust": 10
            }
          },
          {
            "label": "Once, and it was concerning",
            "score": {
              "trust": 5
            }
          },
          {
            "label": "Yes, more than once",
            "score": {
              "trust": 0
            }
          }
        ]
      },
      {
        "text": "Which corridor do you ship most often?",
        "options": [
          {
            "label": "Lagos – Abuja / major corridor",
            "score": {
              "corridor": 10
            }
          },
          {
            "label": "Regional route",
            "score": {
              "corridor": 5
            }
          },
          {
            "label": "Not sure yet",
            "score": {
              "corridor": 0
            }
          }
        ]
      },
      {
        "text": "How frequently do you actually need transport?",
        "options": [
          {
            "label": "Weekly or more",
            "score": {
              "volume": 10,
              "corridor": 10
            }
          },
          {
            "label": "Monthly",
            "score": {
              "volume": 5,
              "corridor": 5
            }
          },
          {
            "label": "One-off",
            "score": {
              "volume": 0,
              "corridor": 0
            }
          }
        ]
      },
      {
        "text": "What would it mean for you to finally trust a freight partner completely?",
        "options": [
          {
            "label": "A real weight off my mind",
            "score": {
              "trust": 10,
              "volume": 10
            }
          },
          {
            "label": "A nice improvement",
            "score": {
              "trust": 5,
              "volume": 5
            }
          },
          {
            "label": "Not something I worry about much",
            "score": {
              "trust": 0,
              "volume": 0
            }
          }
        ]
      },
      {
        "text": "How much visibility do you actually have into where your cargo is at any moment?",
        "options": [
          {
            "label": "Full visibility, I always know",
            "score": {
              "trust": 10,
              "corridor": 10
            }
          },
          {
            "label": "Some visibility, gaps sometimes",
            "score": {
              "trust": 5,
              "corridor": 5
            }
          },
          {
            "label": "Very little, I’m usually in the dark",
            "score": {
              "trust": 0,
              "corridor": 0
            }
          }
        ]
      },
      {
        "text": "What’s stopped you from locking in a reliable freight partner before now?",
        "options": [
          {
            "label": "Just hadn’t found the right fit yet",
            "score": {
              "volume": 10,
              "corridor": 10
            }
          },
          {
            "label": "Rates kept getting in the way",
            "score": {
              "volume": 5,
              "corridor": 5
            }
          },
          {
            "label": "Burned before, cautious now",
            "score": {
              "volume": 0,
              "corridor": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Priority route fit"
      },
      {
        "min": 40,
        "label": "Good fit"
      },
      {
        "min": 0,
        "label": "One-off enquiry"
      }
    ],
    "ctaLabel": "Get a freight quote",
    "sortOrder": 41
  },
  {
    "slug": "home-renovation-readiness-scorecard",
    "title": "Home Renovation Readiness Scorecard",
    "description": "Qualify renovation leads by scope, budget, and timeline before a site visit.",
    "filterCategory": "construction",
    "coverImage": "/covers/home-renovation-readiness-scorecard.svg",
    "intro": "A few honest questions about what’s actually frustrating you about your home right now.",
    "categories": [
      {
        "key": "budget",
        "label": "Budget"
      },
      {
        "key": "scope",
        "label": "Project scope"
      },
      {
        "key": "frustration",
        "label": "Home frustration"
      }
    ],
    "questions": [
      {
        "text": "What’s the thing about your current home that bothers you every single day?",
        "options": [
          {
            "label": "Something specific I can’t stand anymore",
            "score": {
              "frustration": 10
            }
          },
          {
            "label": "A few things, nothing unbearable",
            "score": {
              "frustration": 5
            }
          },
          {
            "label": "Nothing really, just want an upgrade",
            "score": {
              "frustration": 0
            }
          }
        ]
      },
      {
        "text": "What’s your honest renovation budget?",
        "options": [
          {
            "label": "Over ₦10,000,000",
            "score": {
              "budget": 10
            }
          },
          {
            "label": "₦2,000,000 – ₦10,000,000",
            "score": {
              "budget": 5
            }
          },
          {
            "label": "Under ₦2,000,000",
            "score": {
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "Has something in your home ever embarrassed you in front of a guest?",
        "options": [
          {
            "label": "No, never",
            "score": {
              "frustration": 10
            }
          },
          {
            "label": "Once or twice",
            "score": {
              "frustration": 5
            }
          },
          {
            "label": "Yes, more than once",
            "score": {
              "frustration": 0
            }
          }
        ]
      },
      {
        "text": "How extensive does the renovation actually need to be?",
        "options": [
          {
            "label": "Full home renovation",
            "score": {
              "scope": 10
            }
          },
          {
            "label": "A few rooms",
            "score": {
              "scope": 5
            }
          },
          {
            "label": "Single room / cosmetic",
            "score": {
              "scope": 0
            }
          }
        ]
      },
      {
        "text": "When do you actually want to start, not just someday?",
        "options": [
          {
            "label": "Within a month",
            "score": {
              "budget": 10,
              "scope": 10
            }
          },
          {
            "label": "1–3 months",
            "score": {
              "budget": 5,
              "scope": 5
            }
          },
          {
            "label": "Just planning for now",
            "score": {
              "budget": 0,
              "scope": 0
            }
          }
        ]
      },
      {
        "text": "What would it mean for you to finally love coming home?",
        "options": [
          {
            "label": "Everything, that’s exactly what I want",
            "score": {
              "frustration": 10,
              "scope": 10
            }
          },
          {
            "label": "It would be a nice improvement",
            "score": {
              "frustration": 5,
              "scope": 5
            }
          },
          {
            "label": "I already feel that way, mostly",
            "score": {
              "frustration": 0,
              "scope": 0
            }
          }
        ]
      },
      {
        "text": "Has a past contractor or renovation experience ever gone badly for you?",
        "options": [
          {
            "label": "No, this is a fresh project",
            "score": {
              "budget": 10,
              "frustration": 10
            }
          },
          {
            "label": "A minor hiccup once",
            "score": {
              "budget": 5,
              "frustration": 5
            }
          },
          {
            "label": "Yes, and it still worries me",
            "score": {
              "budget": 0,
              "frustration": 0
            }
          }
        ]
      },
      {
        "text": "What’s stopped you from starting this renovation sooner?",
        "options": [
          {
            "label": "Just hadn’t found the right team yet",
            "score": {
              "scope": 10,
              "budget": 10
            }
          },
          {
            "label": "Still saving toward it",
            "score": {
              "scope": 5,
              "budget": 5
            }
          },
          {
            "label": "Worried about the disruption and cost",
            "score": {
              "scope": 0,
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "How does the space actually make you feel when you spend time in it?",
        "options": [
          {
            "label": "Comfortable and proud of it",
            "score": {
              "frustration": 10
            }
          },
          {
            "label": "Fine, nothing special",
            "score": {
              "frustration": 5
            }
          },
          {
            "label": "Honestly a bit embarrassed or drained",
            "score": {
              "frustration": 0
            }
          }
        ]
      },
      {
        "text": "Is anyone else involved in approving this renovation with you?",
        "options": [
          {
            "label": "No, my decision alone",
            "score": {
              "scope": 10
            }
          },
          {
            "label": "Yes, and we’re aligned",
            "score": {
              "scope": 5
            }
          },
          {
            "label": "Yes, and we haven’t agreed yet",
            "score": {
              "scope": 0
            }
          }
        ]
      },
      {
        "text": "What’s the real cost of putting this off another year?",
        "options": [
          {
            "label": "Low, no real urgency",
            "score": {
              "budget": 0,
              "scope": 0
            }
          },
          {
            "label": "Some, it’s getting more noticeable",
            "score": {
              "budget": 5,
              "scope": 5
            }
          },
          {
            "label": "High, it’s only getting worse",
            "score": {
              "budget": 10,
              "scope": 10
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Ready to start"
      },
      {
        "min": 40,
        "label": "Planning stage"
      },
      {
        "min": 0,
        "label": "Early ideas"
      }
    ],
    "ctaLabel": "Book a site visit",
    "sortOrder": 42
  },
  {
    "slug": "which-interior-design-package-fits-your-space",
    "title": "Which Interior Design Package Fits Your Space?",
    "description": "Match a prospect to the right design tier based on space and style preferences.",
    "filterCategory": "construction",
    "coverImage": "/covers/which-interior-design-package-fits-your-space.svg",
    "intro": "A few honest questions about how your space actually makes you feel.",
    "categories": [
      {
        "key": "budget",
        "label": "Budget"
      },
      {
        "key": "style",
        "label": "Style"
      },
      {
        "key": "satisfaction",
        "label": "Space satisfaction"
      }
    ],
    "questions": [
      {
        "text": "How do you honestly feel when you walk into your space right now?",
        "options": [
          {
            "label": "Happy, it already feels like me",
            "score": {
              "satisfaction": 10
            }
          },
          {
            "label": "It’s okay, but something’s missing",
            "score": {
              "satisfaction": 5
            }
          },
          {
            "label": "Uninspired, it doesn’t feel like home",
            "score": {
              "satisfaction": 0
            }
          }
        ]
      },
      {
        "text": "What’s your honest interior design budget?",
        "options": [
          {
            "label": "Premium / bespoke",
            "score": {
              "budget": 10
            }
          },
          {
            "label": "Mid-range",
            "score": {
              "budget": 5
            }
          },
          {
            "label": "Budget-conscious",
            "score": {
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "Has your space ever made you hesitate before inviting someone over?",
        "options": [
          {
            "label": "No, never",
            "score": {
              "satisfaction": 10
            }
          },
          {
            "label": "Once or twice",
            "score": {
              "satisfaction": 5
            }
          },
          {
            "label": "Yes, more than I’d like",
            "score": {
              "satisfaction": 0
            }
          }
        ]
      },
      {
        "text": "What style genuinely feels like \"you\" when you imagine your ideal space?",
        "options": [
          {
            "label": "Luxury / statement pieces",
            "score": {
              "style": 10
            }
          },
          {
            "label": "Modern minimalist",
            "score": {
              "style": 5
            }
          },
          {
            "label": "Not sure yet",
            "score": {
              "style": 0
            }
          }
        ]
      },
      {
        "text": "How large is the space you’re actually working with?",
        "options": [
          {
            "label": "Full house / large space",
            "score": {
              "budget": 10,
              "style": 10
            }
          },
          {
            "label": "A few rooms",
            "score": {
              "budget": 5,
              "style": 5
            }
          },
          {
            "label": "A single room",
            "score": {
              "budget": 0,
              "style": 0
            }
          }
        ]
      },
      {
        "text": "What would it mean for you to finally feel proud of your space?",
        "options": [
          {
            "label": "Everything, that’s exactly what I want",
            "score": {
              "satisfaction": 10,
              "style": 10
            }
          },
          {
            "label": "A nice improvement",
            "score": {
              "satisfaction": 5,
              "style": 5
            }
          },
          {
            "label": "I already feel that way, mostly",
            "score": {
              "satisfaction": 0,
              "style": 0
            }
          }
        ]
      },
      {
        "text": "Has a past design project ever left you disappointed with the result?",
        "options": [
          {
            "label": "No, this is a fresh start",
            "score": {
              "budget": 10,
              "satisfaction": 10
            }
          },
          {
            "label": "A minor letdown once",
            "score": {
              "budget": 5,
              "satisfaction": 5
            }
          },
          {
            "label": "Yes, and it made me cautious",
            "score": {
              "budget": 0,
              "satisfaction": 0
            }
          }
        ]
      },
      {
        "text": "What’s the real reason this space hasn’t been redone until now?",
        "options": [
          {
            "label": "Just hadn’t found the right designer yet",
            "score": {
              "style": 10,
              "budget": 10
            }
          },
          {
            "label": "Still saving toward it",
            "score": {
              "style": 5,
              "budget": 5
            }
          },
          {
            "label": "Kept putting it off",
            "score": {
              "style": 0,
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "How does the current state of the space affect your mood day to day?",
        "options": [
          {
            "label": "Not much, I barely notice it",
            "score": {
              "satisfaction": 10
            }
          },
          {
            "label": "A little, it nags at me",
            "score": {
              "satisfaction": 5
            }
          },
          {
            "label": "A lot, it genuinely drags me down",
            "score": {
              "satisfaction": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Bespoke package fit"
      },
      {
        "min": 40,
        "label": "Standard package fit"
      },
      {
        "min": 0,
        "label": "Starter package fit"
      }
    ],
    "ctaLabel": "Book a design consultation",
    "sortOrder": 43
  },
  {
    "slug": "construction-project-budget-qualifier",
    "title": "Construction Project Budget Qualifier",
    "description": "Score a build project on scope and budget before a contractor call.",
    "filterCategory": "construction",
    "coverImage": "/covers/construction-project-budget-qualifier.svg",
    "intro": "A few honest questions about what’s actually driving this build.",
    "categories": [
      {
        "key": "budget",
        "label": "Budget"
      },
      {
        "key": "scope",
        "label": "Project scope"
      },
      {
        "key": "concern",
        "label": "Build concern"
      }
    ],
    "questions": [
      {
        "text": "What’s the thing that actually worries you most about starting a build?",
        "options": [
          {
            "label": "Not much, I feel prepared",
            "score": {
              "concern": 10
            }
          },
          {
            "label": "Delays or costs spiraling",
            "score": {
              "concern": 5
            }
          },
          {
            "label": "Getting stuck with an unreliable contractor",
            "score": {
              "concern": 0
            }
          }
        ]
      },
      {
        "text": "What type of project is this, honestly?",
        "options": [
          {
            "label": "New build",
            "score": {
              "scope": 10
            }
          },
          {
            "label": "Extension",
            "score": {
              "scope": 5
            }
          },
          {
            "label": "Repair / maintenance",
            "score": {
              "scope": 0
            }
          }
        ]
      },
      {
        "text": "Has a construction project ever gone badly for you or someone close before?",
        "options": [
          {
            "label": "No, this is a fresh start",
            "score": {
              "concern": 10,
              "budget": 10
            }
          },
          {
            "label": "Heard stories, made me cautious",
            "score": {
              "concern": 5,
              "budget": 5
            }
          },
          {
            "label": "Yes, personally, and it still worries me",
            "score": {
              "concern": 0,
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "What’s your honest budget range for this project?",
        "options": [
          {
            "label": "Over ₦30,000,000",
            "score": {
              "budget": 10
            }
          },
          {
            "label": "₦5,000,000 – ₦30,000,000",
            "score": {
              "budget": 5
            }
          },
          {
            "label": "Under ₦5,000,000",
            "score": {
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "Do you have architectural drawings or plans ready?",
        "options": [
          {
            "label": "Yes, approved",
            "score": {
              "budget": 10,
              "scope": 10
            }
          },
          {
            "label": "In progress",
            "score": {
              "budget": 5,
              "scope": 5
            }
          },
          {
            "label": "Not yet",
            "score": {
              "budget": 0,
              "scope": 0
            }
          }
        ]
      },
      {
        "text": "What would it mean for you to have this handled by a team you can genuinely trust?",
        "options": [
          {
            "label": "Everything, that’s exactly what I need",
            "score": {
              "concern": 10,
              "scope": 10
            }
          },
          {
            "label": "It would help a lot",
            "score": {
              "concern": 5,
              "scope": 5
            }
          },
          {
            "label": "Not a major factor for us",
            "score": {
              "concern": 0,
              "scope": 0
            }
          }
        ]
      },
      {
        "text": "What’s stopped this project from starting sooner?",
        "options": [
          {
            "label": "Just hadn’t found the right contractor yet",
            "score": {
              "scope": 10,
              "budget": 10
            }
          },
          {
            "label": "Still finalizing the budget",
            "score": {
              "scope": 5,
              "budget": 5
            }
          },
          {
            "label": "Worried about delays or being overcharged",
            "score": {
              "scope": 0,
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "How much does the current state of the property affect your daily life?",
        "options": [
          {
            "label": "Not much, it’s planned ahead of need",
            "score": {
              "concern": 10
            }
          },
          {
            "label": "Some, it’s becoming an issue",
            "score": {
              "concern": 5
            }
          },
          {
            "label": "A lot, it’s genuinely disruptive",
            "score": {
              "concern": 0
            }
          }
        ]
      },
      {
        "text": "Is anyone else involved in approving this project’s budget?",
        "options": [
          {
            "label": "No, my decision alone",
            "score": {
              "budget": 10
            }
          },
          {
            "label": "Yes, and we’re aligned",
            "score": {
              "budget": 5
            }
          },
          {
            "label": "Yes, and we haven’t agreed yet",
            "score": {
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "What would a delayed or over-budget project actually cost you personally?",
        "options": [
          {
            "label": "Not much, I have flexibility",
            "score": {
              "concern": 0,
              "scope": 0
            }
          },
          {
            "label": "A real financial and time strain",
            "score": {
              "concern": 5,
              "scope": 5
            }
          },
          {
            "label": "A serious, stressful setback",
            "score": {
              "concern": 10,
              "scope": 10
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Ready to build"
      },
      {
        "min": 40,
        "label": "Planning stage"
      },
      {
        "min": 0,
        "label": "Early concept"
      }
    ],
    "ctaLabel": "Request a project quote",
    "sortOrder": 44
  },
  {
    "slug": "do-you-need-a-lawyer-legal-issue-triage",
    "title": "Do You Need a Lawyer? Legal Issue Triage",
    "description": "Triage a legal enquiry by issue type and urgency before a paid consultation.",
    "filterCategory": "legal",
    "coverImage": "/covers/do-you-need-a-lawyer-legal-issue-triage.svg",
    "intro": "A few honest questions about what’s actually weighing on you right now.",
    "categories": [
      {
        "key": "severity",
        "label": "Issue severity"
      },
      {
        "key": "urgency",
        "label": "Urgency"
      },
      {
        "key": "worry",
        "label": "Personal worry"
      }
    ],
    "questions": [
      {
        "text": "What’s the thought that actually keeps circling in your head about this situation?",
        "options": [
          {
            "label": "Fear of losing something important",
            "score": {
              "worry": 10,
              "severity": 10
            }
          },
          {
            "label": "Uncertainty about what happens next",
            "score": {
              "worry": 5,
              "severity": 5
            }
          },
          {
            "label": "Just curious about my options",
            "score": {
              "worry": 0,
              "severity": 0
            }
          }
        ]
      },
      {
        "text": "How would you honestly describe your legal issue?",
        "options": [
          {
            "label": "Involves a dispute or legal action",
            "score": {
              "severity": 10
            }
          },
          {
            "label": "Needs advice / documentation",
            "score": {
              "severity": 5
            }
          },
          {
            "label": "General question",
            "score": {
              "severity": 0
            }
          }
        ]
      },
      {
        "text": "Has this situation already cost you sleep or stress?",
        "options": [
          {
            "label": "No, I’m fairly calm about it",
            "score": {
              "worry": 10
            }
          },
          {
            "label": "Some, it’s on my mind",
            "score": {
              "worry": 5
            }
          },
          {
            "label": "Yes, it’s been really hard",
            "score": {
              "worry": 0
            }
          }
        ]
      },
      {
        "text": "How urgent is this matter, honestly?",
        "options": [
          {
            "label": "Time-sensitive / deadline soon",
            "score": {
              "urgency": 10
            }
          },
          {
            "label": "Important, not urgent",
            "score": {
              "urgency": 5
            }
          },
          {
            "label": "No specific deadline",
            "score": {
              "urgency": 0
            }
          }
        ]
      },
      {
        "text": "Have you consulted a lawyer about this before?",
        "options": [
          {
            "label": "No, this is my first step",
            "score": {
              "severity": 10,
              "urgency": 10
            }
          },
          {
            "label": "Yes, seeking a second opinion",
            "score": {
              "severity": 5,
              "urgency": 5
            }
          },
          {
            "label": "Just researching",
            "score": {
              "severity": 0,
              "urgency": 0
            }
          }
        ]
      },
      {
        "text": "What would it mean for you to finally have clarity on where you stand legally?",
        "options": [
          {
            "label": "A huge relief, that’s exactly what I need",
            "score": {
              "worry": 10,
              "urgency": 10
            }
          },
          {
            "label": "It would help",
            "score": {
              "worry": 5,
              "urgency": 5
            }
          },
          {
            "label": "Not urgent for me right now",
            "score": {
              "worry": 0,
              "urgency": 0
            }
          }
        ]
      },
      {
        "text": "Has someone else involved in this issue already taken legal action or threatened to?",
        "options": [
          {
            "label": "No, nothing like that",
            "score": {
              "severity": 0,
              "urgency": 0
            }
          },
          {
            "label": "They’ve hinted at it",
            "score": {
              "severity": 5,
              "urgency": 5
            }
          },
          {
            "label": "Yes, formally",
            "score": {
              "severity": 10,
              "urgency": 10
            }
          }
        ]
      },
      {
        "text": "What’s the real reason you haven’t spoken to a lawyer about this yet?",
        "options": [
          {
            "label": "Just getting around to it now",
            "score": {
              "urgency": 10,
              "worry": 10
            }
          },
          {
            "label": "Wasn’t sure if it was serious enough",
            "score": {
              "urgency": 5,
              "worry": 5
            }
          },
          {
            "label": "Nervous about what they might say",
            "score": {
              "urgency": 0,
              "worry": 0
            }
          }
        ]
      },
      {
        "text": "If this went unresolved for another few months, what would actually happen?",
        "options": [
          {
            "label": "Not much would change",
            "score": {
              "severity": 0,
              "urgency": 0
            }
          },
          {
            "label": "It would get more complicated",
            "score": {
              "severity": 5,
              "urgency": 5
            }
          },
          {
            "label": "It could seriously damage my position",
            "score": {
              "severity": 10,
              "urgency": 10
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Needs legal counsel"
      },
      {
        "min": 40,
        "label": "Worth a consultation"
      },
      {
        "min": 0,
        "label": "General inquiry"
      }
    ],
    "ctaLabel": "Book a consultation",
    "sortOrder": 45
  },
  {
    "slug": "business-legal-health-check",
    "title": "Business Legal Health Check",
    "description": "A 13-question audit of a business's legal fundamentals — registration, contracts, compliance.",
    "filterCategory": "legal",
    "coverImage": "/covers/business-legal-health-check.svg",
    "intro": "An honest audit of what would actually happen if your business were legally challenged tomorrow.",
    "categories": [
      {
        "key": "compliance",
        "label": "Compliance"
      },
      {
        "key": "contracts",
        "label": "Contracts"
      },
      {
        "key": "exposure",
        "label": "Legal exposure"
      }
    ],
    "questions": [
      {
        "text": "If a client or vendor sued you tomorrow, how would that actually feel?",
        "options": [
          {
            "label": "Calm — I know we’re covered",
            "score": {
              "exposure": 10,
              "contracts": 10
            }
          },
          {
            "label": "Nervous, not entirely sure",
            "score": {
              "exposure": 5,
              "contracts": 5
            }
          },
          {
            "label": "Genuinely alarming",
            "score": {
              "exposure": 0,
              "contracts": 0
            }
          }
        ]
      },
      {
        "text": "Is your business formally registered (CAC)?",
        "options": [
          {
            "label": "Yes, fully registered",
            "score": {
              "compliance": 10
            }
          },
          {
            "label": "In progress",
            "score": {
              "compliance": 5
            }
          },
          {
            "label": "Not yet",
            "score": {
              "compliance": 0
            }
          }
        ]
      },
      {
        "text": "Has a client or vendor relationship ever gone sour without a contract to fall back on?",
        "options": [
          {
            "label": "No, or we always had one",
            "score": {
              "contracts": 10,
              "exposure": 10
            }
          },
          {
            "label": "Once, and it made me nervous",
            "score": {
              "contracts": 5,
              "exposure": 5
            }
          },
          {
            "label": "Yes, and it cost us",
            "score": {
              "contracts": 0,
              "exposure": 0
            }
          }
        ]
      },
      {
        "text": "Do you actually use written contracts with clients or vendors, every time?",
        "options": [
          {
            "label": "Always",
            "score": {
              "contracts": 10
            }
          },
          {
            "label": "Sometimes",
            "score": {
              "contracts": 5
            }
          },
          {
            "label": "Rarely",
            "score": {
              "contracts": 0
            }
          }
        ]
      },
      {
        "text": "What keeps you up at night about the legal side of the business?",
        "options": [
          {
            "label": "Nothing, I feel covered",
            "score": {
              "exposure": 10
            }
          },
          {
            "label": "A vague sense something could be missed",
            "score": {
              "exposure": 5
            }
          },
          {
            "label": "Real worry about a specific gap",
            "score": {
              "exposure": 0
            }
          }
        ]
      },
      {
        "text": "When did a lawyer last actually review your business documents?",
        "options": [
          {
            "label": "Within the last year",
            "score": {
              "compliance": 10,
              "contracts": 10
            }
          },
          {
            "label": "Over a year ago",
            "score": {
              "compliance": 5,
              "contracts": 5
            }
          },
          {
            "label": "Never",
            "score": {
              "compliance": 0,
              "contracts": 0
            }
          }
        ]
      },
      {
        "text": "Has an employee or partner dispute ever caught your business off guard?",
        "options": [
          {
            "label": "No, never happened",
            "score": {
              "exposure": 10,
              "compliance": 10
            }
          },
          {
            "label": "A small one, handled quietly",
            "score": {
              "exposure": 5,
              "compliance": 5
            }
          },
          {
            "label": "Yes, and it was messy",
            "score": {
              "exposure": 0,
              "compliance": 0
            }
          }
        ]
      },
      {
        "text": "How confident are you that your intellectual property and brand are actually protected?",
        "options": [
          {
            "label": "Very confident",
            "score": {
              "compliance": 10
            }
          },
          {
            "label": "Somewhat, not fully sure",
            "score": {
              "compliance": 5
            }
          },
          {
            "label": "Not confident at all",
            "score": {
              "compliance": 0
            }
          }
        ]
      },
      {
        "text": "What would it mean for you to finally stop worrying about legal blind spots?",
        "options": [
          {
            "label": "A real weight off my shoulders",
            "score": {
              "exposure": 10,
              "compliance": 10
            }
          },
          {
            "label": "It would help",
            "score": {
              "exposure": 5,
              "compliance": 5
            }
          },
          {
            "label": "Not something I stress over much",
            "score": {
              "exposure": 0,
              "compliance": 0
            }
          }
        ]
      },
      {
        "text": "What’s stopped you from getting a proper legal review before now?",
        "options": [
          {
            "label": "Just hadn’t prioritized it yet",
            "score": {
              "compliance": 10,
              "contracts": 10
            }
          },
          {
            "label": "Wasn’t sure what it would actually cost",
            "score": {
              "compliance": 5,
              "contracts": 5
            }
          },
          {
            "label": "Worried about what they might find",
            "score": {
              "compliance": 0,
              "contracts": 0
            }
          }
        ]
      },
      {
        "text": "Do you know, off the top of your head, which regulations actually apply to your business?",
        "options": [
          {
            "label": "Yes, I track this closely",
            "score": {
              "compliance": 10
            }
          },
          {
            "label": "Roughly, not in detail",
            "score": {
              "compliance": 5
            }
          },
          {
            "label": "Honestly, no idea",
            "score": {
              "compliance": 0
            }
          }
        ]
      },
      {
        "text": "Has a regulatory or tax issue ever caught your business by surprise?",
        "options": [
          {
            "label": "No, never",
            "score": {
              "compliance": 10,
              "exposure": 10
            }
          },
          {
            "label": "A minor one, resolved quickly",
            "score": {
              "compliance": 5,
              "exposure": 5
            }
          },
          {
            "label": "Yes, and it was costly",
            "score": {
              "compliance": 0,
              "exposure": 0
            }
          }
        ]
      },
      {
        "text": "How would leadership react if a legal issue surfaced that hadn’t been caught in advance?",
        "options": [
          {
            "label": "Confidently, we’d be prepared",
            "score": {
              "exposure": 10,
              "contracts": 10
            }
          },
          {
            "label": "Some concern, but manageable",
            "score": {
              "exposure": 5,
              "contracts": 5
            }
          },
          {
            "label": "It would be a real crisis",
            "score": {
              "exposure": 0,
              "contracts": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Legally sound"
      },
      {
        "min": 40,
        "label": "Some gaps"
      },
      {
        "min": 0,
        "label": "At risk"
      }
    ],
    "ctaLabel": "Book a legal health check",
    "sortOrder": 46
  },
  {
    "slug": "which-legal-service-do-you-need",
    "title": "Which Legal Service Do You Need?",
    "description": "Route enquiries to the right practice area automatically — no wasted intake calls.",
    "filterCategory": "legal",
    "coverImage": "/covers/which-legal-service-do-you-need.svg",
    "intro": "A few honest questions to get you to the right person, fast.",
    "categories": [
      {
        "key": "area",
        "label": "Practice area fit"
      },
      {
        "key": "urgency",
        "label": "Urgency"
      },
      {
        "key": "weight",
        "label": "Emotional weight"
      }
    ],
    "questions": [
      {
        "text": "How much has this issue actually been weighing on you?",
        "options": [
          {
            "label": "Not much, fairly routine",
            "score": {
              "weight": 10
            }
          },
          {
            "label": "A fair amount",
            "score": {
              "weight": 5
            }
          },
          {
            "label": "A lot, it’s hard to think about anything else",
            "score": {
              "weight": 0
            }
          }
        ]
      },
      {
        "text": "What area does your issue actually fall under?",
        "options": [
          {
            "label": "Business / commercial",
            "score": {
              "area": 10
            }
          },
          {
            "label": "Property / real estate",
            "score": {
              "area": 5
            }
          },
          {
            "label": "Personal / family",
            "score": {
              "area": 0
            }
          }
        ]
      },
      {
        "text": "How soon do you genuinely need to speak with someone about this?",
        "options": [
          {
            "label": "This week",
            "score": {
              "urgency": 10
            }
          },
          {
            "label": "This month",
            "score": {
              "urgency": 5
            }
          },
          {
            "label": "No rush",
            "score": {
              "urgency": 0
            }
          }
        ]
      },
      {
        "text": "Is this for yourself or your business, and how personal does it feel?",
        "options": [
          {
            "label": "My business, fairly straightforward",
            "score": {
              "area": 10,
              "urgency": 10
            }
          },
          {
            "label": "Both, and it’s a bit stressful",
            "score": {
              "area": 5,
              "urgency": 5
            }
          },
          {
            "label": "Personal, and it feels heavy",
            "score": {
              "area": 0,
              "urgency": 0
            }
          }
        ]
      },
      {
        "text": "What would it mean for you to finally have the right person in your corner?",
        "options": [
          {
            "label": "A real relief",
            "score": {
              "weight": 10,
              "urgency": 10
            }
          },
          {
            "label": "It would help",
            "score": {
              "weight": 5,
              "urgency": 5
            }
          },
          {
            "label": "Not urgent for me right now",
            "score": {
              "weight": 0,
              "urgency": 0
            }
          }
        ]
      },
      {
        "text": "Have you tried to handle this on your own so far?",
        "options": [
          {
            "label": "Yes, and I want a second opinion now",
            "score": {
              "area": 10,
              "weight": 10
            }
          },
          {
            "label": "A little, informally",
            "score": {
              "area": 5,
              "weight": 5
            }
          },
          {
            "label": "No, this is my first step",
            "score": {
              "area": 0,
              "weight": 0
            }
          }
        ]
      },
      {
        "text": "What’s the outcome you’re actually hoping for from this?",
        "options": [
          {
            "label": "A clear, specific resolution",
            "score": {
              "urgency": 10,
              "area": 10
            }
          },
          {
            "label": "Just some clarity on my options",
            "score": {
              "urgency": 5,
              "area": 5
            }
          },
          {
            "label": "Honestly not sure yet",
            "score": {
              "urgency": 0,
              "area": 0
            }
          }
        ]
      },
      {
        "text": "If this went unaddressed, how would that actually affect you?",
        "options": [
          {
            "label": "Not much, low stakes",
            "score": {
              "weight": 0
            }
          },
          {
            "label": "Some ongoing stress",
            "score": {
              "weight": 5
            }
          },
          {
            "label": "Significantly, it’s a real concern",
            "score": {
              "weight": 10
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Priority routing"
      },
      {
        "min": 40,
        "label": "Standard routing"
      },
      {
        "min": 0,
        "label": "General inquiry"
      }
    ],
    "ctaLabel": "Get matched to the right lawyer",
    "sortOrder": 47
  },
  {
    "slug": "farm-financing-readiness-assessment",
    "title": "Farm Financing Readiness Assessment",
    "description": "Qualify smallholder leads by farm size, output, and financing need.",
    "filterCategory": "agritech",
    "coverImage": "/covers/farm-financing-readiness-assessment.svg",
    "intro": "A few honest questions about what’s actually holding your farm back from growing.",
    "categories": [
      {
        "key": "scale",
        "label": "Farm scale"
      },
      {
        "key": "readiness",
        "label": "Financing readiness"
      },
      {
        "key": "strain",
        "label": "Season-to-season strain"
      }
    ],
    "questions": [
      {
        "text": "What actually keeps you worried between planting and harvest?",
        "options": [
          {
            "label": "Not much, things are fairly stable",
            "score": {
              "strain": 10
            }
          },
          {
            "label": "Weather or input costs",
            "score": {
              "strain": 5
            }
          },
          {
            "label": "Whether I’ll have enough to get through",
            "score": {
              "strain": 0
            }
          }
        ]
      },
      {
        "text": "How large is your farm, honestly?",
        "options": [
          {
            "label": "Over 10 hectares",
            "score": {
              "scale": 10
            }
          },
          {
            "label": "1–10 hectares",
            "score": {
              "scale": 5
            }
          },
          {
            "label": "Under 1 hectare",
            "score": {
              "scale": 0
            }
          }
        ]
      },
      {
        "text": "Has a bad season ever left you unable to cover the next planting cycle?",
        "options": [
          {
            "label": "No, never happened",
            "score": {
              "strain": 10,
              "readiness": 10
            }
          },
          {
            "label": "Once, and it was tight",
            "score": {
              "strain": 5,
              "readiness": 5
            }
          },
          {
            "label": "Yes, more than once",
            "score": {
              "strain": 0,
              "readiness": 0
            }
          }
        ]
      },
      {
        "text": "Do you actually have records of past yield or sales?",
        "options": [
          {
            "label": "Yes, documented",
            "score": {
              "readiness": 10
            }
          },
          {
            "label": "Some records",
            "score": {
              "readiness": 5
            }
          },
          {
            "label": "No records",
            "score": {
              "readiness": 0
            }
          }
        ]
      },
      {
        "text": "What financing are you actually looking for?",
        "options": [
          {
            "label": "Over ₦1,000,000",
            "score": {
              "scale": 10,
              "readiness": 10
            }
          },
          {
            "label": "₦200,000 – ₦1,000,000",
            "score": {
              "scale": 5,
              "readiness": 5
            }
          },
          {
            "label": "Under ₦200,000",
            "score": {
              "scale": 0,
              "readiness": 0
            }
          }
        ]
      },
      {
        "text": "What would it mean for you to finally have breathing room between seasons?",
        "options": [
          {
            "label": "A real relief, that’s exactly what I need",
            "score": {
              "strain": 10,
              "scale": 10
            }
          },
          {
            "label": "It would help a lot",
            "score": {
              "strain": 5,
              "scale": 5
            }
          },
          {
            "label": "Not something I stress over much",
            "score": {
              "strain": 0,
              "scale": 0
            }
          }
        ]
      },
      {
        "text": "Has a lender ever turned you down or made the process feel humiliating?",
        "options": [
          {
            "label": "No, never applied or it went fine",
            "score": {
              "readiness": 10
            }
          },
          {
            "label": "A frustrating process, but manageable",
            "score": {
              "readiness": 5
            }
          },
          {
            "label": "Yes, and it discouraged me from trying again",
            "score": {
              "readiness": 0
            }
          }
        ]
      },
      {
        "text": "What’s the real reason you haven’t sought financing before now?",
        "options": [
          {
            "label": "Just hadn’t found the right option yet",
            "score": {
              "scale": 10,
              "readiness": 10
            }
          },
          {
            "label": "Wasn’t sure I’d qualify",
            "score": {
              "scale": 5,
              "readiness": 5
            }
          },
          {
            "label": "Worried about taking on debt I couldn’t repay",
            "score": {
              "scale": 0,
              "readiness": 0
            }
          }
        ]
      },
      {
        "text": "How does an unpredictable harvest actually affect your household?",
        "options": [
          {
            "label": "Manageable, we have a buffer",
            "score": {
              "strain": 10
            }
          },
          {
            "label": "Noticeable strain some seasons",
            "score": {
              "strain": 5
            }
          },
          {
            "label": "Genuinely difficult, every bad season hurts",
            "score": {
              "strain": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Strong financing candidate"
      },
      {
        "min": 40,
        "label": "Needs some documentation"
      },
      {
        "min": 0,
        "label": "Early stage"
      }
    ],
    "ctaLabel": "Apply for financing",
    "sortOrder": 48
  },
  {
    "slug": "which-agritech-solution-fits-your-farm",
    "title": "Which AgriTech Solution Fits Your Farm?",
    "description": "Match a farmer to the right input, tooling, or market-access offer.",
    "filterCategory": "agritech",
    "coverImage": "/covers/which-agritech-solution-fits-your-farm.svg",
    "intro": "A few honest questions about what actually frustrates you about farming right now.",
    "categories": [
      {
        "key": "need",
        "label": "Primary need"
      },
      {
        "key": "scale",
        "label": "Farm scale"
      },
      {
        "key": "frustration",
        "label": "Operational frustration"
      }
    ],
    "questions": [
      {
        "text": "What’s the part of running this farm that frustrates you the most?",
        "options": [
          {
            "label": "Not knowing where to sell what I grow",
            "score": {
              "need": 10,
              "frustration": 5
            }
          },
          {
            "label": "Never having reliable inputs on time",
            "score": {
              "need": 5,
              "frustration": 5
            }
          },
          {
            "label": "Watching produce go to waste",
            "score": {
              "need": 0,
              "frustration": 0
            }
          }
        ]
      },
      {
        "text": "What’s your biggest challenge right now, honestly?",
        "options": [
          {
            "label": "Access to buyers / market",
            "score": {
              "need": 10
            }
          },
          {
            "label": "Quality inputs / equipment",
            "score": {
              "need": 5
            }
          },
          {
            "label": "Storage & post-harvest loss",
            "score": {
              "need": 0
            }
          }
        ]
      },
      {
        "text": "Has a lack of the right tools or information ever cost you a harvest?",
        "options": [
          {
            "label": "No, never",
            "score": {
              "frustration": 10
            }
          },
          {
            "label": "A partial loss once",
            "score": {
              "frustration": 5
            }
          },
          {
            "label": "Yes, and it hurt badly",
            "score": {
              "frustration": 0
            }
          }
        ]
      },
      {
        "text": "How large is your operation?",
        "options": [
          {
            "label": "Commercial farm",
            "score": {
              "scale": 10
            }
          },
          {
            "label": "Mid-size / cooperative",
            "score": {
              "scale": 5
            }
          },
          {
            "label": "Smallholder",
            "score": {
              "scale": 0
            }
          }
        ]
      },
      {
        "text": "Do you currently use any farm technology or apps?",
        "options": [
          {
            "label": "Yes, actively",
            "score": {
              "need": 10,
              "scale": 10
            }
          },
          {
            "label": "Tried it once",
            "score": {
              "need": 5,
              "scale": 5
            }
          },
          {
            "label": "Never",
            "score": {
              "need": 0,
              "scale": 0
            }
          }
        ]
      },
      {
        "text": "What would it mean for you to finally have full control over where your produce goes?",
        "options": [
          {
            "label": "Everything, that’s exactly what I need",
            "score": {
              "need": 10,
              "frustration": 10
            }
          },
          {
            "label": "A meaningful improvement",
            "score": {
              "need": 5,
              "frustration": 5
            }
          },
          {
            "label": "Not something I stress over much",
            "score": {
              "need": 0,
              "frustration": 0
            }
          }
        ]
      },
      {
        "text": "Has a middleman or buyer ever taken advantage of you on price?",
        "options": [
          {
            "label": "No, or I have good relationships",
            "score": {
              "need": 10,
              "scale": 5
            }
          },
          {
            "label": "Sometimes, hard to say no",
            "score": {
              "need": 5,
              "scale": 5
            }
          },
          {
            "label": "Yes, regularly, and it frustrates me",
            "score": {
              "need": 0,
              "scale": 0
            }
          }
        ]
      },
      {
        "text": "What’s stopped you from trying a tech-based solution before now?",
        "options": [
          {
            "label": "Just hadn’t come across the right one",
            "score": {
              "scale": 10,
              "frustration": 10
            }
          },
          {
            "label": "Wasn’t sure it would actually help",
            "score": {
              "scale": 5,
              "frustration": 5
            }
          },
          {
            "label": "Worried it would be too complicated",
            "score": {
              "scale": 0,
              "frustration": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Ready to adopt"
      },
      {
        "min": 40,
        "label": "Open to trying"
      },
      {
        "min": 0,
        "label": "Needs introduction"
      }
    ],
    "ctaLabel": "See your matched solution",
    "sortOrder": 49
  },
  {
    "slug": "post-harvest-loss-risk-check",
    "title": "Post-Harvest Loss Risk Check",
    "description": "Score a farm's storage and logistics gaps — a natural lead-in to a paid solution.",
    "filterCategory": "agritech",
    "coverImage": "/covers/post-harvest-loss-risk-check.svg",
    "intro": "A few honest questions about what it actually feels like to watch a harvest go to waste.",
    "categories": [
      {
        "key": "storage",
        "label": "Storage capacity"
      },
      {
        "key": "logistics",
        "label": "Logistics gap"
      },
      {
        "key": "heartbreak",
        "label": "Loss frustration"
      }
    ],
    "questions": [
      {
        "text": "What’s it actually like watching part of a harvest spoil before it can be sold?",
        "options": [
          {
            "label": "Rare for us, not a big feeling",
            "score": {
              "heartbreak": 10
            }
          },
          {
            "label": "Frustrating, but it happens",
            "score": {
              "heartbreak": 5
            }
          },
          {
            "label": "Genuinely painful, every time",
            "score": {
              "heartbreak": 0
            }
          }
        ]
      },
      {
        "text": "Do you have dedicated storage for your harvest?",
        "options": [
          {
            "label": "No proper storage",
            "score": {
              "storage": 10
            }
          },
          {
            "label": "Basic storage only",
            "score": {
              "storage": 5
            }
          },
          {
            "label": "Yes, proper facilities",
            "score": {
              "storage": 0
            }
          }
        ]
      },
      {
        "text": "Has spoiled produce ever meant real money lost that you needed?",
        "options": [
          {
            "label": "No, or it’s never been significant",
            "score": {
              "heartbreak": 10,
              "storage": 10
            }
          },
          {
            "label": "Some, noticeable but manageable",
            "score": {
              "heartbreak": 5,
              "storage": 5
            }
          },
          {
            "label": "Yes, and it really set us back",
            "score": {
              "heartbreak": 0,
              "storage": 0
            }
          }
        ]
      },
      {
        "text": "How do you currently get produce to market?",
        "options": [
          {
            "label": "No reliable transport",
            "score": {
              "logistics": 10
            }
          },
          {
            "label": "Informal arrangements",
            "score": {
              "logistics": 5
            }
          },
          {
            "label": "Reliable logistics partner",
            "score": {
              "logistics": 0
            }
          }
        ]
      },
      {
        "text": "What share of your harvest would you honestly estimate is lost each season?",
        "options": [
          {
            "label": "More than 30%",
            "score": {
              "storage": 10,
              "logistics": 10
            }
          },
          {
            "label": "10–30%",
            "score": {
              "storage": 5,
              "logistics": 5
            }
          },
          {
            "label": "Under 10%",
            "score": {
              "storage": 0,
              "logistics": 0
            }
          }
        ]
      },
      {
        "text": "What would it mean for you to finally stop losing part of every harvest?",
        "options": [
          {
            "label": "A huge difference, that’s exactly what I need",
            "score": {
              "heartbreak": 10,
              "logistics": 10
            }
          },
          {
            "label": "A real improvement",
            "score": {
              "heartbreak": 5,
              "logistics": 5
            }
          },
          {
            "label": "Not a major concern for us",
            "score": {
              "heartbreak": 0,
              "logistics": 0
            }
          }
        ]
      },
      {
        "text": "How far is your farm from the nearest reliable market?",
        "options": [
          {
            "label": "Close, easy access",
            "score": {
              "logistics": 10
            }
          },
          {
            "label": "A moderate distance",
            "score": {
              "logistics": 5
            }
          },
          {
            "label": "Far, and it’s a real barrier",
            "score": {
              "logistics": 0
            }
          }
        ]
      },
      {
        "text": "What’s stopped you from investing in better storage or logistics before now?",
        "options": [
          {
            "label": "Just hadn’t found the right option",
            "score": {
              "storage": 10,
              "logistics": 10
            }
          },
          {
            "label": "Wasn’t sure it would pay off",
            "score": {
              "storage": 5,
              "logistics": 5
            }
          },
          {
            "label": "Cost has been the barrier",
            "score": {
              "storage": 0,
              "logistics": 0
            }
          }
        ]
      },
      {
        "text": "How does a heavy loss season affect the rest of your household’s plans?",
        "options": [
          {
            "label": "Manageable, we have a buffer",
            "score": {
              "heartbreak": 10
            }
          },
          {
            "label": "Noticeable, we adjust",
            "score": {
              "heartbreak": 5
            }
          },
          {
            "label": "Serious impact, every time",
            "score": {
              "heartbreak": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "High loss risk"
      },
      {
        "min": 40,
        "label": "Moderate risk"
      },
      {
        "min": 0,
        "label": "Well managed"
      }
    ],
    "ctaLabel": "Get a free storage assessment",
    "sortOrder": 50
  },
  {
    "slug": "event-catering-budget-and-menu-match",
    "title": "Event Catering Budget & Menu Match",
    "description": "Qualify catering enquiries by guest count, budget, and menu style.",
    "filterCategory": "foodservice",
    "coverImage": "/covers/event-catering-budget-and-menu-match.svg",
    "intro": "A few honest questions about what would actually make or break this event for you.",
    "categories": [
      {
        "key": "budget",
        "label": "Budget"
      },
      {
        "key": "scale",
        "label": "Event scale"
      },
      {
        "key": "anxiety",
        "label": "Event-day anxiety"
      }
    ],
    "questions": [
      {
        "text": "What’s the scenario that would actually stress you out most on the day itself?",
        "options": [
          {
            "label": "Not much worries me, I trust the plan",
            "score": {
              "anxiety": 10
            }
          },
          {
            "label": "Running short on food",
            "score": {
              "anxiety": 5
            }
          },
          {
            "label": "The whole thing feeling disorganized",
            "score": {
              "anxiety": 0
            }
          }
        ]
      },
      {
        "text": "How many guests are you actually catering for?",
        "options": [
          {
            "label": "300+",
            "score": {
              "scale": 10
            }
          },
          {
            "label": "50–300",
            "score": {
              "scale": 5
            }
          },
          {
            "label": "Under 50",
            "score": {
              "scale": 0
            }
          }
        ]
      },
      {
        "text": "Has a caterer ever let you down before, or come close to it?",
        "options": [
          {
            "label": "No, never happened",
            "score": {
              "anxiety": 10,
              "budget": 5
            }
          },
          {
            "label": "A close call once",
            "score": {
              "anxiety": 5,
              "budget": 5
            }
          },
          {
            "label": "Yes, and it was stressful",
            "score": {
              "anxiety": 0,
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "What’s your honest per-guest budget?",
        "options": [
          {
            "label": "Premium",
            "score": {
              "budget": 10
            }
          },
          {
            "label": "Mid-range",
            "score": {
              "budget": 5
            }
          },
          {
            "label": "Budget-friendly",
            "score": {
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "When is your event, and how does that timeline feel?",
        "options": [
          {
            "label": "Within a month — feels tight",
            "score": {
              "budget": 10,
              "scale": 10
            }
          },
          {
            "label": "1–3 months — comfortable",
            "score": {
              "budget": 5,
              "scale": 5
            }
          },
          {
            "label": "More than 3 months away — plenty of time",
            "score": {
              "budget": 0,
              "scale": 0
            }
          }
        ]
      },
      {
        "text": "What would it mean for you to know the food is completely taken care of?",
        "options": [
          {
            "label": "A huge relief, one less thing to worry about",
            "score": {
              "anxiety": 10,
              "scale": 10
            }
          },
          {
            "label": "It would help",
            "score": {
              "anxiety": 5,
              "scale": 5
            }
          },
          {
            "label": "Not something I stress about much",
            "score": {
              "anxiety": 0,
              "scale": 0
            }
          }
        ]
      },
      {
        "text": "Do you have guests with specific dietary needs you’re worried about accommodating?",
        "options": [
          {
            "label": "No, or it’s already sorted",
            "score": {
              "scale": 10,
              "anxiety": 10
            }
          },
          {
            "label": "A few, manageable",
            "score": {
              "scale": 5,
              "anxiety": 5
            }
          },
          {
            "label": "Several, and it worries me",
            "score": {
              "scale": 0,
              "anxiety": 0
            }
          }
        ]
      },
      {
        "text": "What’s the real reason nothing’s been booked yet?",
        "options": [
          {
            "label": "Just hasn’t found the right caterer yet",
            "score": {
              "budget": 10,
              "scale": 10
            }
          },
          {
            "label": "Comparing a few quotes",
            "score": {
              "budget": 5,
              "scale": 5
            }
          },
          {
            "label": "Budget and quality keep clashing",
            "score": {
              "budget": 0,
              "scale": 0
            }
          }
        ]
      },
      {
        "text": "How much does hosting well actually matter to your reputation with this crowd?",
        "options": [
          {
            "label": "A little, low pressure",
            "score": {
              "anxiety": 0
            }
          },
          {
            "label": "Somewhat, I want it to go well",
            "score": {
              "anxiety": 5
            }
          },
          {
            "label": "A lot, I really want to impress",
            "score": {
              "anxiety": 10
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Ready to book"
      },
      {
        "min": 40,
        "label": "Comparing quotes"
      },
      {
        "min": 0,
        "label": "Early planning"
      }
    ],
    "ctaLabel": "Request a catering quote",
    "sortOrder": 51
  },
  {
    "slug": "which-catering-package-fits-your-event",
    "title": "Which Catering Package Fits Your Event?",
    "description": "Match a lead to the right package tier before a costly custom quote.",
    "filterCategory": "foodservice",
    "coverImage": "/covers/which-catering-package-fits-your-event.svg",
    "intro": "A few honest questions about what actually matters to you about this event.",
    "categories": [
      {
        "key": "style",
        "label": "Service style"
      },
      {
        "key": "budget",
        "label": "Budget"
      },
      {
        "key": "impression",
        "label": "Impression it leaves"
      }
    ],
    "questions": [
      {
        "text": "What impression do you actually want guests to walk away with?",
        "options": [
          {
            "label": "Genuinely impressed and talking about it after",
            "score": {
              "impression": 10
            }
          },
          {
            "label": "Comfortable and well fed",
            "score": {
              "impression": 5
            }
          },
          {
            "label": "Not a big concern, just functional",
            "score": {
              "impression": 0
            }
          }
        ]
      },
      {
        "text": "What style of service do you actually want?",
        "options": [
          {
            "label": "Full-service, plated",
            "score": {
              "style": 10
            }
          },
          {
            "label": "Buffet style",
            "score": {
              "style": 5
            }
          },
          {
            "label": "Drop-off / self-serve",
            "score": {
              "style": 0
            }
          }
        ]
      },
      {
        "text": "Has a past event’s food ever fallen flat and embarrassed you?",
        "options": [
          {
            "label": "No, never",
            "score": {
              "impression": 10
            }
          },
          {
            "label": "Once, minor",
            "score": {
              "impression": 5
            }
          },
          {
            "label": "Yes, and it stuck with me",
            "score": {
              "impression": 0
            }
          }
        ]
      },
      {
        "text": "What’s your honest catering budget?",
        "options": [
          {
            "label": "Premium",
            "score": {
              "budget": 10
            }
          },
          {
            "label": "Mid-range",
            "score": {
              "budget": 5
            }
          },
          {
            "label": "Budget-friendly",
            "score": {
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "Do you have specific menu or dietary requirements to accommodate?",
        "options": [
          {
            "label": "Yes, custom menu needed",
            "score": {
              "style": 10,
              "budget": 10
            }
          },
          {
            "label": "A few preferences",
            "score": {
              "style": 5,
              "budget": 5
            }
          },
          {
            "label": "Standard menu is fine",
            "score": {
              "style": 0,
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "What would it mean for you if this event’s food was genuinely memorable?",
        "options": [
          {
            "label": "Everything, that’s exactly the goal",
            "score": {
              "impression": 10,
              "style": 10
            }
          },
          {
            "label": "A nice bonus",
            "score": {
              "impression": 5,
              "style": 5
            }
          },
          {
            "label": "Not the main priority",
            "score": {
              "impression": 0,
              "style": 0
            }
          }
        ]
      },
      {
        "text": "Who’s actually going to be at this event, and how much does that raise the stakes?",
        "options": [
          {
            "label": "People I really want to impress",
            "score": {
              "impression": 10,
              "budget": 10
            }
          },
          {
            "label": "A mix, some pressure",
            "score": {
              "impression": 5,
              "budget": 5
            }
          },
          {
            "label": "Close friends and family, relaxed",
            "score": {
              "impression": 0,
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "What’s the real reason you haven’t picked a package yet?",
        "options": [
          {
            "label": "Just comparing final options",
            "score": {
              "style": 10,
              "budget": 10
            }
          },
          {
            "label": "Still figuring out the guest count",
            "score": {
              "style": 5,
              "budget": 5
            }
          },
          {
            "label": "Worried about picking the wrong one",
            "score": {
              "style": 0,
              "budget": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Premium package fit"
      },
      {
        "min": 40,
        "label": "Standard package fit"
      },
      {
        "min": 0,
        "label": "Basic package fit"
      }
    ],
    "ctaLabel": "See your matched package",
    "sortOrder": 52
  },
  {
    "slug": "corporate-catering-needs-qualifier",
    "title": "Corporate Catering Needs Qualifier",
    "description": "Score recurring-order potential before your team quotes a one-off event.",
    "filterCategory": "foodservice",
    "coverImage": "/covers/corporate-catering-needs-qualifier.svg",
    "intro": "A few honest questions about what’s actually not working with catering right now.",
    "categories": [
      {
        "key": "frequency",
        "label": "Order frequency"
      },
      {
        "key": "scale",
        "label": "Order scale"
      },
      {
        "key": "dissatisfaction",
        "label": "Provider dissatisfaction"
      }
    ],
    "questions": [
      {
        "text": "What’s actually prompting this review of your catering setup?",
        "options": [
          {
            "label": "Repeated frustration with the current provider",
            "score": {
              "dissatisfaction": 10
            }
          },
          {
            "label": "Wanting to compare options",
            "score": {
              "dissatisfaction": 5
            }
          },
          {
            "label": "First time considering this at all",
            "score": {
              "dissatisfaction": 0
            }
          }
        ]
      },
      {
        "text": "How often would you honestly need catering?",
        "options": [
          {
            "label": "Weekly / recurring",
            "score": {
              "frequency": 10
            }
          },
          {
            "label": "Monthly",
            "score": {
              "frequency": 5
            }
          },
          {
            "label": "One-off event",
            "score": {
              "frequency": 0
            }
          }
        ]
      },
      {
        "text": "Have staff or clients ever complained about the food at your events?",
        "options": [
          {
            "label": "No, feedback has been good",
            "score": {
              "dissatisfaction": 10
            }
          },
          {
            "label": "A little grumbling, nothing major",
            "score": {
              "dissatisfaction": 5
            }
          },
          {
            "label": "Yes, and it’s become a recurring issue",
            "score": {
              "dissatisfaction": 0
            }
          }
        ]
      },
      {
        "text": "How many staff or guests do you typically cater for?",
        "options": [
          {
            "label": "100+",
            "score": {
              "scale": 10
            }
          },
          {
            "label": "30–100",
            "score": {
              "scale": 5
            }
          },
          {
            "label": "Under 30",
            "score": {
              "scale": 0
            }
          }
        ]
      },
      {
        "text": "Do you have an existing catering budget or contract right now?",
        "options": [
          {
            "label": "Yes, looking to switch providers",
            "score": {
              "frequency": 10,
              "scale": 10
            }
          },
          {
            "label": "No formal contract yet",
            "score": {
              "frequency": 5,
              "scale": 5
            }
          },
          {
            "label": "First time considering this",
            "score": {
              "frequency": 0,
              "scale": 0
            }
          }
        ]
      },
      {
        "text": "What would it mean for your team to finally have catering that just works?",
        "options": [
          {
            "label": "A real improvement to morale and my own workload",
            "score": {
              "dissatisfaction": 10,
              "frequency": 10
            }
          },
          {
            "label": "A nice improvement",
            "score": {
              "dissatisfaction": 5,
              "frequency": 5
            }
          },
          {
            "label": "Not a big concern currently",
            "score": {
              "dissatisfaction": 0,
              "frequency": 0
            }
          }
        ]
      },
      {
        "text": "How often do you personally have to step in to sort out a catering issue?",
        "options": [
          {
            "label": "Rarely, it’s handled well",
            "score": {
              "dissatisfaction": 10
            }
          },
          {
            "label": "Occasionally",
            "score": {
              "dissatisfaction": 5
            }
          },
          {
            "label": "More often than I’d like",
            "score": {
              "dissatisfaction": 0
            }
          }
        ]
      },
      {
        "text": "Who ultimately signs off on switching or upgrading a catering provider?",
        "options": [
          {
            "label": "Me, directly",
            "score": {
              "scale": 10,
              "frequency": 10
            }
          },
          {
            "label": "Me, with approval from someone else",
            "score": {
              "scale": 5,
              "frequency": 5
            }
          },
          {
            "label": "Someone else entirely",
            "score": {
              "scale": 0,
              "frequency": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "High-value account"
      },
      {
        "min": 40,
        "label": "Solid opportunity"
      },
      {
        "min": 0,
        "label": "One-off enquiry"
      }
    ],
    "ctaLabel": "Talk to our corporate team",
    "sortOrder": 53
  },
  {
    "slug": "diaspora-property-investment-readiness-score",
    "title": "Diaspora Property Investment Readiness Score",
    "description": "Qualify diaspora leads investing back home by budget and readiness.",
    "filterCategory": "diaspora",
    "coverImage": "/covers/diaspora-property-investment-readiness-score.svg",
    "intro": "A few honest questions about what actually worries you about investing back home.",
    "categories": [
      {
        "key": "budget",
        "label": "Investment budget"
      },
      {
        "key": "readiness",
        "label": "Readiness"
      },
      {
        "key": "trust",
        "label": "Trust concern"
      }
    ],
    "questions": [
      {
        "text": "What’s the fear that actually crosses your mind about investing back home from abroad?",
        "options": [
          {
            "label": "Not much fear, I feel prepared",
            "score": {
              "trust": 10
            }
          },
          {
            "label": "Worry about getting a fair deal",
            "score": {
              "trust": 5
            }
          },
          {
            "label": "Real fear of being scammed or cheated",
            "score": {
              "trust": 0
            }
          }
        ]
      },
      {
        "text": "How much are you honestly looking to invest in property back home?",
        "options": [
          {
            "label": "Over $50,000",
            "score": {
              "budget": 10
            }
          },
          {
            "label": "$10,000 – $50,000",
            "score": {
              "budget": 5
            }
          },
          {
            "label": "Under $10,000",
            "score": {
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "Has someone you know been defrauded on a property deal back home?",
        "options": [
          {
            "label": "No, or it didn’t worry me",
            "score": {
              "trust": 10
            }
          },
          {
            "label": "Heard stories, made me cautious",
            "score": {
              "trust": 5
            }
          },
          {
            "label": "Yes, someone close, and it really shook me",
            "score": {
              "trust": 0
            }
          }
        ]
      },
      {
        "text": "Do you have someone you genuinely trust managing things on the ground?",
        "options": [
          {
            "label": "Yes",
            "score": {
              "readiness": 10,
              "trust": 10
            }
          },
          {
            "label": "Considering options",
            "score": {
              "readiness": 5,
              "trust": 5
            }
          },
          {
            "label": "Not yet",
            "score": {
              "readiness": 0,
              "trust": 0
            }
          }
        ]
      },
      {
        "text": "When are you actually looking to invest, not just someday?",
        "options": [
          {
            "label": "Within 6 months",
            "score": {
              "budget": 10,
              "readiness": 10
            }
          },
          {
            "label": "Within a year",
            "score": {
              "budget": 5,
              "readiness": 5
            }
          },
          {
            "label": "Just exploring",
            "score": {
              "budget": 0,
              "readiness": 0
            }
          }
        ]
      },
      {
        "text": "What would it mean for you to finally invest without constantly worrying from a distance?",
        "options": [
          {
            "label": "A real peace of mind, that’s what I need",
            "score": {
              "trust": 10,
              "readiness": 10
            }
          },
          {
            "label": "It would help",
            "score": {
              "trust": 5,
              "readiness": 5
            }
          },
          {
            "label": "Not something I stress over much",
            "score": {
              "trust": 0,
              "readiness": 0
            }
          }
        ]
      },
      {
        "text": "What’s stopped you from investing back home before now?",
        "options": [
          {
            "label": "Just hadn’t found the right opportunity",
            "score": {
              "budget": 10,
              "readiness": 10
            }
          },
          {
            "label": "Still building up savings",
            "score": {
              "budget": 5,
              "readiness": 5
            }
          },
          {
            "label": "Fear of being taken advantage of remotely",
            "score": {
              "budget": 0,
              "readiness": 0
            }
          }
        ]
      },
      {
        "text": "How often do you actually think about property back home when you can’t act on it?",
        "options": [
          {
            "label": "Rarely, I have a clear plan",
            "score": {
              "readiness": 10
            }
          },
          {
            "label": "Sometimes, it nags at me",
            "score": {
              "readiness": 5
            }
          },
          {
            "label": "Often, it weighs on me",
            "score": {
              "readiness": 0
            }
          }
        ]
      },
      {
        "text": "How confident are you that you’d actually know if something was going wrong on the ground?",
        "options": [
          {
            "label": "Very confident, I’d know immediately",
            "score": {
              "trust": 10,
              "readiness": 10
            }
          },
          {
            "label": "Somewhat, not fully sure",
            "score": {
              "trust": 5,
              "readiness": 5
            }
          },
          {
            "label": "Not confident at all",
            "score": {
              "trust": 0,
              "readiness": 0
            }
          }
        ]
      },
      {
        "text": "What would this investment actually mean for your long-term plans back home?",
        "options": [
          {
            "label": "A significant part of my future there",
            "score": {
              "budget": 10,
              "trust": 10
            }
          },
          {
            "label": "A meaningful step",
            "score": {
              "budget": 5,
              "trust": 5
            }
          },
          {
            "label": "Still figuring that out",
            "score": {
              "budget": 0,
              "trust": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Investor-ready"
      },
      {
        "min": 40,
        "label": "Building toward it"
      },
      {
        "min": 0,
        "label": "Exploring options"
      }
    ],
    "ctaLabel": "Talk to an investment advisor",
    "sortOrder": 54
  },
  {
    "slug": "which-remittance-or-investment-service-fits-you",
    "title": "Which Remittance or Investment Service Fits You?",
    "description": "Match a diaspora prospect to the right transfer or investment product.",
    "filterCategory": "diaspora",
    "coverImage": "/covers/which-remittance-or-investment-service-fits-you.svg",
    "intro": "A few honest questions about what sending money home actually feels like for you.",
    "categories": [
      {
        "key": "frequency",
        "label": "Transfer frequency"
      },
      {
        "key": "goal",
        "label": "Financial goal"
      },
      {
        "key": "frustration",
        "label": "Transfer frustration"
      }
    ],
    "questions": [
      {
        "text": "What’s actually the most frustrating part of sending money home right now?",
        "options": [
          {
            "label": "Nothing much, my current setup works well",
            "score": {
              "frustration": 10
            }
          },
          {
            "label": "Fees eating into what actually arrives",
            "score": {
              "frustration": 5
            }
          },
          {
            "label": "Delays and not knowing if it landed",
            "score": {
              "frustration": 0
            }
          }
        ]
      },
      {
        "text": "How often do you actually send money home?",
        "options": [
          {
            "label": "Monthly or more",
            "score": {
              "frequency": 10
            }
          },
          {
            "label": "A few times a year",
            "score": {
              "frequency": 5
            }
          },
          {
            "label": "Rarely",
            "score": {
              "frequency": 0
            }
          }
        ]
      },
      {
        "text": "Has a transfer ever gone missing or been delayed when it really mattered?",
        "options": [
          {
            "label": "No, never",
            "score": {
              "frustration": 10
            }
          },
          {
            "label": "Once, and it was stressful",
            "score": {
              "frustration": 5
            }
          },
          {
            "label": "Yes, more than once",
            "score": {
              "frustration": 0
            }
          }
        ]
      },
      {
        "text": "What’s your honest main financial goal with this money?",
        "options": [
          {
            "label": "Growing savings/investments",
            "score": {
              "goal": 10
            }
          },
          {
            "label": "Supporting family",
            "score": {
              "goal": 5
            }
          },
          {
            "label": "Just need a reliable transfer",
            "score": {
              "goal": 0
            }
          }
        ]
      },
      {
        "text": "Roughly how much do you send per transfer?",
        "options": [
          {
            "label": "Over $1,000",
            "score": {
              "frequency": 10,
              "goal": 10
            }
          },
          {
            "label": "$200 – $1,000",
            "score": {
              "frequency": 5,
              "goal": 5
            }
          },
          {
            "label": "Under $200",
            "score": {
              "frequency": 0,
              "goal": 0
            }
          }
        ]
      },
      {
        "text": "What would it mean for you to finally send money without worrying about it?",
        "options": [
          {
            "label": "A real relief, that’s exactly what I need",
            "score": {
              "frustration": 10,
              "goal": 10
            }
          },
          {
            "label": "It would help",
            "score": {
              "frustration": 5,
              "goal": 5
            }
          },
          {
            "label": "Not something I stress over much",
            "score": {
              "frustration": 0,
              "goal": 0
            }
          }
        ]
      },
      {
        "text": "How much have exchange rate losses actually bothered you over time?",
        "options": [
          {
            "label": "Not much, I don’t track it closely",
            "score": {
              "frustration": 10
            }
          },
          {
            "label": "Some, I’ve noticed it add up",
            "score": {
              "frustration": 5
            }
          },
          {
            "label": "A lot, it genuinely frustrates me",
            "score": {
              "frustration": 0
            }
          }
        ]
      },
      {
        "text": "What’s stopped you from switching to a better service before now?",
        "options": [
          {
            "label": "Just hadn’t found the right one yet",
            "score": {
              "goal": 10,
              "frequency": 10
            }
          },
          {
            "label": "Comparing a few options",
            "score": {
              "goal": 5,
              "frequency": 5
            }
          },
          {
            "label": "Worried about trusting a new provider",
            "score": {
              "goal": 0,
              "frequency": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Premium service fit"
      },
      {
        "min": 40,
        "label": "Standard service fit"
      },
      {
        "min": 0,
        "label": "Basic transfer fit"
      }
    ],
    "ctaLabel": "See your matched service",
    "sortOrder": 55
  },
  {
    "slug": "diaspora-retirement-planning-check",
    "title": "Diaspora Retirement Planning Check",
    "description": "Score retirement-back-home readiness before a paid financial planning session.",
    "filterCategory": "diaspora",
    "coverImage": "/covers/diaspora-retirement-planning-check.svg",
    "intro": "A few honest questions about what retirement back home actually looks like in your mind.",
    "categories": [
      {
        "key": "timeline",
        "label": "Retirement timeline"
      },
      {
        "key": "planning",
        "label": "Planning progress"
      },
      {
        "key": "anxiety",
        "label": "Retirement anxiety"
      }
    ],
    "questions": [
      {
        "text": "What’s the thought that actually worries you most about retiring back home?",
        "options": [
          {
            "label": "Not much, I feel prepared",
            "score": {
              "anxiety": 10
            }
          },
          {
            "label": "Whether my savings will be enough",
            "score": {
              "anxiety": 5
            }
          },
          {
            "label": "Genuine anxiety about the whole picture",
            "score": {
              "anxiety": 0
            }
          }
        ]
      },
      {
        "text": "When are you honestly planning to retire or relocate back home?",
        "options": [
          {
            "label": "Within 5 years",
            "score": {
              "timeline": 10
            }
          },
          {
            "label": "5–15 years",
            "score": {
              "timeline": 5
            }
          },
          {
            "label": "More than 15 years",
            "score": {
              "timeline": 0
            }
          }
        ]
      },
      {
        "text": "Have you ever felt behind compared to peers who seem to have a retirement plan sorted?",
        "options": [
          {
            "label": "No, I feel on track",
            "score": {
              "anxiety": 10,
              "planning": 10
            }
          },
          {
            "label": "A little, sometimes",
            "score": {
              "anxiety": 5,
              "planning": 5
            }
          },
          {
            "label": "Yes, often",
            "score": {
              "anxiety": 0,
              "planning": 0
            }
          }
        ]
      },
      {
        "text": "Do you actually have a retirement savings or investment plan?",
        "options": [
          {
            "label": "Yes, active plan",
            "score": {
              "planning": 10
            }
          },
          {
            "label": "Some savings, no formal plan",
            "score": {
              "planning": 5
            }
          },
          {
            "label": "Not yet started",
            "score": {
              "planning": 0
            }
          }
        ]
      },
      {
        "text": "Have you thought through, in detail, where you’ll actually live back home?",
        "options": [
          {
            "label": "Yes, decided",
            "score": {
              "timeline": 10,
              "planning": 10
            }
          },
          {
            "label": "Some ideas",
            "score": {
              "timeline": 5,
              "planning": 5
            }
          },
          {
            "label": "Not yet",
            "score": {
              "timeline": 0,
              "planning": 0
            }
          }
        ]
      },
      {
        "text": "What would it mean for you to finally feel at peace about this transition?",
        "options": [
          {
            "label": "A real relief, that’s exactly what I need",
            "score": {
              "anxiety": 10,
              "timeline": 10
            }
          },
          {
            "label": "It would help a lot",
            "score": {
              "anxiety": 5,
              "timeline": 5
            }
          },
          {
            "label": "I already feel mostly at peace",
            "score": {
              "anxiety": 0,
              "timeline": 0
            }
          }
        ]
      },
      {
        "text": "What’s stopped you from putting a proper plan together before now?",
        "options": [
          {
            "label": "Just hadn’t prioritized it yet",
            "score": {
              "planning": 10,
              "timeline": 10
            }
          },
          {
            "label": "Wasn’t sure where to start",
            "score": {
              "planning": 5,
              "timeline": 5
            }
          },
          {
            "label": "Kept putting it off out of uncertainty",
            "score": {
              "planning": 0,
              "timeline": 0
            }
          }
        ]
      },
      {
        "text": "How often do conversations with family back home touch on \"when are you coming back\"?",
        "options": [
          {
            "label": "Rarely, it’s already settled",
            "score": {
              "timeline": 10
            }
          },
          {
            "label": "Sometimes",
            "score": {
              "timeline": 5
            }
          },
          {
            "label": "Often, and it adds pressure",
            "score": {
              "timeline": 0
            }
          }
        ]
      },
      {
        "text": "Have you compared the actual cost of living back home to what you currently save?",
        "options": [
          {
            "label": "Yes, I have a clear picture",
            "score": {
              "planning": 10,
              "anxiety": 10
            }
          },
          {
            "label": "Roughly, not in detail",
            "score": {
              "planning": 5,
              "anxiety": 5
            }
          },
          {
            "label": "No, honestly haven’t looked closely",
            "score": {
              "planning": 0,
              "anxiety": 0
            }
          }
        ]
      },
      {
        "text": "What would retiring back home actually mean for your day-to-day life?",
        "options": [
          {
            "label": "A genuinely exciting new chapter",
            "score": {
              "timeline": 10,
              "anxiety": 10
            }
          },
          {
            "label": "A mix of excitement and uncertainty",
            "score": {
              "timeline": 5,
              "anxiety": 5
            }
          },
          {
            "label": "Honestly hard to picture right now",
            "score": {
              "timeline": 0,
              "anxiety": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Well prepared"
      },
      {
        "min": 40,
        "label": "Making progress"
      },
      {
        "min": 0,
        "label": "Early planning"
      }
    ],
    "ctaLabel": "Book a planning session",
    "sortOrder": 56
  },
  {
    "slug": "marketing-budget-and-fit-assessment",
    "title": "Marketing Budget & Fit Assessment",
    "description": "Score a business's budget and goals before your agency pitches a retainer.",
    "filterCategory": "marketing",
    "coverImage": "/covers/marketing-budget-and-fit-assessment.svg",
    "intro": "A few honest questions about what’s actually frustrating about growth right now.",
    "categories": [
      {
        "key": "budget",
        "label": "Marketing budget"
      },
      {
        "key": "readiness",
        "label": "Readiness"
      },
      {
        "key": "frustration",
        "label": "Growth frustration"
      }
    ],
    "questions": [
      {
        "text": "What’s actually frustrating about how customers find you right now?",
        "options": [
          {
            "label": "Not much, growth feels steady",
            "score": {
              "frustration": 10
            }
          },
          {
            "label": "It’s inconsistent, hard to predict",
            "score": {
              "frustration": 5
            }
          },
          {
            "label": "Honestly, nothing’s working",
            "score": {
              "frustration": 0
            }
          }
        ]
      },
      {
        "text": "What’s your honest current monthly marketing budget?",
        "options": [
          {
            "label": "Over ₦1,000,000",
            "score": {
              "budget": 10
            }
          },
          {
            "label": "₦100,000 – ₦1,000,000",
            "score": {
              "budget": 5
            }
          },
          {
            "label": "Under ₦100,000",
            "score": {
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "Has money spent on marketing ever felt wasted, with nothing to show for it?",
        "options": [
          {
            "label": "No, spend has generally paid off",
            "score": {
              "budget": 10,
              "frustration": 10
            }
          },
          {
            "label": "Some, mixed results",
            "score": {
              "budget": 5,
              "frustration": 5
            }
          },
          {
            "label": "Yes, and it really bothers me",
            "score": {
              "budget": 0,
              "frustration": 0
            }
          }
        ]
      },
      {
        "text": "Do you actually have a clearly defined target audience?",
        "options": [
          {
            "label": "Yes, clearly defined",
            "score": {
              "readiness": 10
            }
          },
          {
            "label": "Rough idea",
            "score": {
              "readiness": 5
            }
          },
          {
            "label": "Not really",
            "score": {
              "readiness": 0
            }
          }
        ]
      },
      {
        "text": "Have you run paid marketing campaigns before?",
        "options": [
          {
            "label": "Yes, regularly",
            "score": {
              "budget": 10,
              "readiness": 10
            }
          },
          {
            "label": "Once or twice",
            "score": {
              "budget": 5,
              "readiness": 5
            }
          },
          {
            "label": "Never",
            "score": {
              "budget": 0,
              "readiness": 0
            }
          }
        ]
      },
      {
        "text": "What would it mean for you to finally have marketing that reliably brings in customers?",
        "options": [
          {
            "label": "Everything, that’s exactly what I need",
            "score": {
              "frustration": 10,
              "readiness": 10
            }
          },
          {
            "label": "A meaningful improvement",
            "score": {
              "frustration": 5,
              "readiness": 5
            }
          },
          {
            "label": "Not something I stress over much",
            "score": {
              "frustration": 0,
              "readiness": 0
            }
          }
        ]
      },
      {
        "text": "How does it feel watching competitors seemingly figure this out while you’re still guessing?",
        "options": [
          {
            "label": "Not something I compare myself to",
            "score": {
              "frustration": 10
            }
          },
          {
            "label": "A bit of pressure, honestly",
            "score": {
              "frustration": 5
            }
          },
          {
            "label": "Genuinely discouraging at times",
            "score": {
              "frustration": 0
            }
          }
        ]
      },
      {
        "text": "Has a past agency or freelancer ever overpromised and underdelivered for you?",
        "options": [
          {
            "label": "No, or this is a first attempt",
            "score": {
              "budget": 10,
              "frustration": 10
            }
          },
          {
            "label": "A minor letdown once",
            "score": {
              "budget": 5,
              "frustration": 5
            }
          },
          {
            "label": "Yes, and it made me cautious",
            "score": {
              "budget": 0,
              "frustration": 0
            }
          }
        ]
      },
      {
        "text": "What’s the real reason marketing hasn’t been a priority until now?",
        "options": [
          {
            "label": "It has been, just refining the approach",
            "score": {
              "readiness": 10,
              "budget": 10
            }
          },
          {
            "label": "Other things kept taking priority",
            "score": {
              "readiness": 5,
              "budget": 5
            }
          },
          {
            "label": "Wasn’t sure where to even start",
            "score": {
              "readiness": 0,
              "budget": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Ready to invest"
      },
      {
        "min": 40,
        "label": "Building toward it"
      },
      {
        "min": 0,
        "label": "Early stage"
      }
    ],
    "ctaLabel": "Book a strategy call",
    "sortOrder": 57
  },
  {
    "slug": "which-marketing-package-fits-your-business",
    "title": "Which Marketing Package Fits Your Business?",
    "description": "Match SMEs to the right service tier — social, SEO, or full-funnel — automatically.",
    "filterCategory": "marketing",
    "coverImage": "/covers/which-marketing-package-fits-your-business.svg",
    "intro": "A few honest questions about what’s actually missing from your marketing right now.",
    "categories": [
      {
        "key": "goal",
        "label": "Primary goal"
      },
      {
        "key": "budget",
        "label": "Budget"
      },
      {
        "key": "overwhelm",
        "label": "Marketing overwhelm"
      }
    ],
    "questions": [
      {
        "text": "How do you honestly feel trying to keep up with marketing on your own?",
        "options": [
          {
            "label": "Fine, I have a handle on it",
            "score": {
              "overwhelm": 10
            }
          },
          {
            "label": "Stretched, doing my best",
            "score": {
              "overwhelm": 5
            }
          },
          {
            "label": "Overwhelmed, it’s too much",
            "score": {
              "overwhelm": 0
            }
          }
        ]
      },
      {
        "text": "What’s your honest top marketing priority right now?",
        "options": [
          {
            "label": "Full-funnel lead generation",
            "score": {
              "goal": 10
            }
          },
          {
            "label": "Brand visibility / social",
            "score": {
              "goal": 5
            }
          },
          {
            "label": "Just getting started",
            "score": {
              "goal": 0
            }
          }
        ]
      },
      {
        "text": "Has trying to DIY your marketing ever eaten into time you needed elsewhere?",
        "options": [
          {
            "label": "No, it’s manageable",
            "score": {
              "overwhelm": 10,
              "goal": 5
            }
          },
          {
            "label": "Sometimes",
            "score": {
              "overwhelm": 5,
              "goal": 5
            }
          },
          {
            "label": "Constantly, it’s a real drain",
            "score": {
              "overwhelm": 0,
              "goal": 0
            }
          }
        ]
      },
      {
        "text": "What’s your honest monthly budget for this?",
        "options": [
          {
            "label": "Over ₦500,000",
            "score": {
              "budget": 10
            }
          },
          {
            "label": "₦100,000 – ₦500,000",
            "score": {
              "budget": 5
            }
          },
          {
            "label": "Under ₦100,000",
            "score": {
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "Do you have in-house marketing support already?",
        "options": [
          {
            "label": "No, need full support",
            "score": {
              "goal": 10,
              "budget": 10
            }
          },
          {
            "label": "Some, need extra help",
            "score": {
              "goal": 5,
              "budget": 5
            }
          },
          {
            "label": "Yes, fairly self-sufficient",
            "score": {
              "goal": 0,
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "What would it mean for you to hand this off to people who actually know what they’re doing?",
        "options": [
          {
            "label": "A huge relief, exactly what I need",
            "score": {
              "overwhelm": 10,
              "budget": 10
            }
          },
          {
            "label": "It would help",
            "score": {
              "overwhelm": 5,
              "budget": 5
            }
          },
          {
            "label": "I enjoy doing it myself",
            "score": {
              "overwhelm": 0,
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "Has an inconsistent posting or campaign schedule ever visibly hurt your business?",
        "options": [
          {
            "label": "No, consistency hasn’t been an issue",
            "score": {
              "overwhelm": 10
            }
          },
          {
            "label": "A little, noticeable dips",
            "score": {
              "overwhelm": 5
            }
          },
          {
            "label": "Yes, it’s a recurring problem",
            "score": {
              "overwhelm": 0
            }
          }
        ]
      },
      {
        "text": "What’s the real reason you haven’t brought in outside help before now?",
        "options": [
          {
            "label": "Just hadn’t found the right fit yet",
            "score": {
              "goal": 10,
              "budget": 10
            }
          },
          {
            "label": "Budget timing wasn’t right",
            "score": {
              "goal": 5,
              "budget": 5
            }
          },
          {
            "label": "Worried it wouldn’t actually help",
            "score": {
              "goal": 0,
              "budget": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Full-service fit"
      },
      {
        "min": 40,
        "label": "Growth package fit"
      },
      {
        "min": 0,
        "label": "Starter package fit"
      }
    ],
    "ctaLabel": "See your matched package",
    "sortOrder": 58
  },
  {
    "slug": "ad-spend-readiness-audit",
    "title": "Ad Spend Readiness Audit",
    "description": "Qualify a business's readiness to invest in paid ads before a strategy call.",
    "filterCategory": "marketing",
    "coverImage": "/covers/ad-spend-readiness-audit.svg",
    "intro": "A few honest questions about what’s actually happened with ad spend so far.",
    "categories": [
      {
        "key": "budget",
        "label": "Ad budget"
      },
      {
        "key": "foundation",
        "label": "Marketing foundation"
      },
      {
        "key": "burned",
        "label": "Past ad spend pain"
      }
    ],
    "questions": [
      {
        "text": "Have you ever spent money on ads and watched it disappear with nothing to show for it?",
        "options": [
          {
            "label": "No, or results have been solid",
            "score": {
              "burned": 10
            }
          },
          {
            "label": "Somewhat, mixed results",
            "score": {
              "burned": 5
            }
          },
          {
            "label": "Yes, and it really stung",
            "score": {
              "burned": 0
            }
          }
        ]
      },
      {
        "text": "What’s your honest planned monthly ad spend?",
        "options": [
          {
            "label": "Over ₦300,000",
            "score": {
              "budget": 10
            }
          },
          {
            "label": "₦50,000 – ₦300,000",
            "score": {
              "budget": 5
            }
          },
          {
            "label": "Under ₦50,000",
            "score": {
              "budget": 0
            }
          }
        ]
      },
      {
        "text": "How confident are you that you’d actually know if an ad campaign was working?",
        "options": [
          {
            "label": "Very confident",
            "score": {
              "foundation": 10,
              "burned": 10
            }
          },
          {
            "label": "Somewhat, not fully sure",
            "score": {
              "foundation": 5,
              "burned": 5
            }
          },
          {
            "label": "Not confident at all",
            "score": {
              "foundation": 0,
              "burned": 0
            }
          }
        ]
      },
      {
        "text": "Do you have a website or landing page that’s actually ready for traffic?",
        "options": [
          {
            "label": "Yes, optimised and ready",
            "score": {
              "foundation": 10
            }
          },
          {
            "label": "Have one, needs work",
            "score": {
              "foundation": 5
            }
          },
          {
            "label": "No landing page yet",
            "score": {
              "foundation": 0
            }
          }
        ]
      },
      {
        "text": "Do you have tracking (pixel/analytics) actually set up right now?",
        "options": [
          {
            "label": "Yes",
            "score": {
              "budget": 10,
              "foundation": 10
            }
          },
          {
            "label": "Partially",
            "score": {
              "budget": 5,
              "foundation": 5
            }
          },
          {
            "label": "No",
            "score": {
              "budget": 0,
              "foundation": 0
            }
          }
        ]
      },
      {
        "text": "What would it mean for you to finally trust that ad spend is working?",
        "options": [
          {
            "label": "A real relief, that’s exactly what I need",
            "score": {
              "burned": 10,
              "foundation": 10
            }
          },
          {
            "label": "It would help a lot",
            "score": {
              "burned": 5,
              "foundation": 5
            }
          },
          {
            "label": "Not something I worry about much",
            "score": {
              "burned": 0,
              "foundation": 0
            }
          }
        ]
      },
      {
        "text": "What’s the real reason ad spend hasn’t worked out for you before?",
        "options": [
          {
            "label": "It has, I’m just exploring scaling up",
            "score": {
              "budget": 10,
              "burned": 10
            }
          },
          {
            "label": "Never had the right foundation in place",
            "score": {
              "budget": 5,
              "burned": 5
            }
          },
          {
            "label": "Spent money without really knowing what I was doing",
            "score": {
              "budget": 0,
              "burned": 0
            }
          }
        ]
      },
      {
        "text": "How does it feel explaining ad performance to someone else in the business?",
        "options": [
          {
            "label": "Confident, I can show clear results",
            "score": {
              "foundation": 10,
              "burned": 10
            }
          },
          {
            "label": "A bit uneasy, numbers are fuzzy",
            "score": {
              "foundation": 5,
              "burned": 5
            }
          },
          {
            "label": "Dread, I usually avoid the topic",
            "score": {
              "foundation": 0,
              "burned": 0
            }
          }
        ]
      },
      {
        "text": "Is anyone else involved in approving this ad budget with you?",
        "options": [
          {
            "label": "No, my decision alone",
            "score": {
              "budget": 10
            }
          },
          {
            "label": "Yes, and we’re aligned",
            "score": {
              "budget": 5
            }
          },
          {
            "label": "Yes, and it’s hard to get buy-in",
            "score": {
              "budget": 0
            }
          }
        ]
      }
    ],
    "tiers": [
      {
        "min": 70,
        "label": "Ad-ready"
      },
      {
        "min": 40,
        "label": "Needs some setup"
      },
      {
        "min": 0,
        "label": "Foundations first"
      }
    ],
    "ctaLabel": "Book an ads strategy call",
    "sortOrder": 59
  }
];

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false },
  });

  let inserted = 0;
  let skipped = 0;
  for (const t of TEMPLATES) {
    const existing = await pool.query('SELECT id FROM templates WHERE slug = $1', [t.slug]);
    if (existing.rows.length) {
      skipped += 1;
      continue;
    }
    const id = crypto.randomUUID();
    await pool.query(
      `INSERT INTO templates
        (id, slug, title, description, filter_category, cover_image, intro, categories, questions, tiers, cta_label, published, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 1, $12)`,
      [
        id, t.slug, t.title, t.description, t.filterCategory, t.coverImage, t.intro,
        JSON.stringify(t.categories), JSON.stringify(t.questions), JSON.stringify(t.tiers),
        t.ctaLabel, t.sortOrder,
      ]
    );
    inserted += 1;
  }

  console.log(`Seeded ${inserted} template(s), skipped ${skipped} already-present slug(s).`);
  await pool.end();
}

main().catch((err) => {
  console.error('[seed-templates] failed:', err);
  process.exit(1);
});