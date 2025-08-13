# DebateAI Launch Metrics Dashboard

> Quick reference for tracking GTM success  
> Updated: August 13, 2025

## 📊 Key Metrics to Track Daily

### Acquisition Metrics
```javascript
const dailyMetrics = {
  // Traffic
  websiteVisitors: 0,
  uniqueVisitors: 0,
  
  // Conversion Funnel
  signups: 0,
  signupRate: 0, // signups / visitors
  
  // Activation
  firstDebateCreated: 0,
  firstChatSent: 0,
  apiKeysAdded: 0,
  
  // Revenue
  freeTrialStarts: 0,
  paidConversions: 0,
  newMRR: 0,
  churnedMRR: 0,
  netNewMRR: 0
};
```

### Weekly Cohort Analysis
| Week | Signups | Week 1 Retained | Week 2 Retained | Week 4 Retained | Paid Conversion |
|------|---------|-----------------|-----------------|-----------------|-----------------|
| Week 1 | - | - | - | - | - |
| Week 2 | - | - | - | - | - |
| Week 3 | - | - | - | - | - |
| Week 4 | - | - | - | - | - |

### Channel Performance
| Channel | Investment | Signups | CAC | Paid Users | ROI |
|---------|------------|---------|-----|------------|-----|
| Product Hunt | $0 | - | $0 | - | - |
| Reddit | $0 | - | $0 | - | - |
| Google Ads | $500 | - | - | - | - |
| Facebook | $500 | - | - | - | - |
| Content/SEO | $1000 | - | - | - | - |

---

## 🎯 Launch Week Targets

### Day 1 (Product Hunt)
- [ ] Visitors: 5,000
- [ ] Signups: 500 (10%)
- [ ] Debates created: 100
- [ ] Product Hunt rank: Top 5

### Day 7
- [ ] Total signups: 2,000
- [ ] Active users: 800 (40%)
- [ ] Paid conversions: 100 (5%)
- [ ] MRR: $500

### Day 30
- [ ] Total signups: 10,000
- [ ] Active users: 4,000 (40%)
- [ ] Paid conversions: 500 (5%)
- [ ] MRR: $3,000

---

## 🔥 Viral Metrics

### Sharing Metrics
```javascript
const viralMetrics = {
  // Sharing
  debatesCreated: 0,
  debatesShared: 0,
  shareRate: 0, // shared / created
  
  // Viral Coefficient
  invitesSent: 0,
  invitesAccepted: 0,
  viralCoefficient: 0, // (invites × acceptance rate)
  
  // Social
  twitterMentions: 0,
  redditMentions: 0,
  linkedinShares: 0
};
```

### Content Performance
| Content Type | Posts | Views | Engagement | Conversions |
|--------------|-------|-------|------------|-------------|
| Debate Clips | - | - | - | - |
| Blog Posts | - | - | - | - |
| Tutorials | - | - | - | - |
| Social Posts | - | - | - | - |

---

## 💰 Revenue Tracking

### MRR Movement
```
Starting MRR: $0
+ New MRR: $0
+ Expansion MRR: $0
- Contraction MRR: $0
- Churn MRR: $0
= Ending MRR: $0

Growth Rate: 0%
Net Revenue Retention: 0%
```

### Pricing Tier Performance
| Tier | Users | MRR | % of Total | Avg. LTV | Churn Rate |
|------|-------|-----|------------|----------|------------|
| Personal ($4.99) | - | - | - | - | - |
| Pro ($9.99) | - | - | - | - | - |
| Team ($39.99) | - | - | - | - | - |
| Lifetime ($199) | - | - | - | - | - |

---

## 📈 Analytics Setup Checklist

### Essential Tools (Pre-Launch)
- [ ] Google Analytics 4
- [ ] Mixpanel or Amplitude
- [ ] Hotjar (heatmaps)
- [ ] Customer.io (email)
- [ ] Intercom (support)

### Tracking Implementation
- [ ] Page view tracking
- [ ] Event tracking (all CTAs)
- [ ] Conversion funnel setup
- [ ] Attribution tracking
- [ ] Revenue tracking

### Key Events to Track
```javascript
// Essential events for analytics
const trackingEvents = {
  // Acquisition
  'landing_page_view': {},
  'signup_started': {},
  'signup_completed': { method: 'email|google|apple' },
  
  // Activation
  'api_key_added': { provider: 'claude|openai|gemini' },
  'first_debate_created': { topic: string },
  'first_chat_sent': { ai_count: number },
  
  // Engagement
  'debate_created': { topic: string, ai_count: number },
  'debate_shared': { platform: 'twitter|reddit|link' },
  'chat_message_sent': { ai: string },
  
  // Revenue
  'trial_started': { tier: 'personal|pro' },
  'subscription_created': { tier: string, price: number },
  'subscription_cancelled': { reason: string },
  
  // Retention
  'app_opened': { days_since_signup: number },
  'feature_used': { feature: string }
};
```

---

## 🎯 OKRs for Launch Quarter

### Objective 1: Achieve Product-Market Fit
- **KR1**: 40% Week 4 retention
- **KR2**: NPS score >50
- **KR3**: 50% of users create >3 debates

### Objective 2: Build Sustainable Growth Engine
- **KR1**: CAC <$10
- **KR2**: Viral coefficient >0.5
- **KR3**: 30% of growth from organic

### Objective 3: Establish Revenue Foundation
- **KR1**: $50K MRR by end of Q1
- **KR2**: <5% monthly churn
- **KR3**: LTV:CAC ratio >3:1

---

## 📱 Quick SQL Queries for Analysis

### Daily Active Users
```sql
SELECT 
  DATE(timestamp) as date,
  COUNT(DISTINCT user_id) as dau
FROM events
WHERE event_name = 'app_opened'
  AND timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(timestamp)
ORDER BY date DESC;
```

### Conversion Funnel
```sql
WITH funnel AS (
  SELECT 
    user_id,
    MAX(CASE WHEN event = 'signup_completed' THEN 1 ELSE 0 END) as signed_up,
    MAX(CASE WHEN event = 'api_key_added' THEN 1 ELSE 0 END) as activated,
    MAX(CASE WHEN event = 'trial_started' THEN 1 ELSE 0 END) as trial,
    MAX(CASE WHEN event = 'subscription_created' THEN 1 ELSE 0 END) as paid
  FROM events
  GROUP BY user_id
)
SELECT 
  COUNT(*) as total_users,
  SUM(signed_up) as signups,
  SUM(activated) as activated,
  SUM(trial) as trials,
  SUM(paid) as paid_users,
  ROUND(100.0 * SUM(activated) / SUM(signed_up), 2) as activation_rate,
  ROUND(100.0 * SUM(paid) / SUM(signed_up), 2) as conversion_rate
FROM funnel;
```

### Cohort Retention
```sql
WITH cohorts AS (
  SELECT 
    user_id,
    DATE_TRUNC('week', MIN(timestamp)) as cohort_week
  FROM events
  WHERE event_name = 'signup_completed'
  GROUP BY user_id
),
activities AS (
  SELECT 
    user_id,
    DATE_TRUNC('week', timestamp) as activity_week
  FROM events
  WHERE event_name = 'app_opened'
  GROUP BY user_id, DATE_TRUNC('week', timestamp)
)
SELECT 
  c.cohort_week,
  COUNT(DISTINCT c.user_id) as cohort_size,
  COUNT(DISTINCT CASE 
    WHEN a.activity_week = c.cohort_week + INTERVAL '1 week' 
    THEN a.user_id END) as week_1_retained,
  COUNT(DISTINCT CASE 
    WHEN a.activity_week = c.cohort_week + INTERVAL '2 weeks' 
    THEN a.user_id END) as week_2_retained
FROM cohorts c
LEFT JOIN activities a ON c.user_id = a.user_id
GROUP BY c.cohort_week
ORDER BY c.cohort_week;
```

---

## 🚨 Red Flags to Watch

### Danger Signals
- [ ] Day 1 retention <30%
- [ ] Week 1 retention <20%
- [ ] API keys added <10% of signups
- [ ] Debates created <20% of users
- [ ] Share rate <5% of debates
- [ ] Support tickets >10% of DAU

### If These Happen, Immediately:
1. Survey churned users
2. Analyze drop-off points
3. Review onboarding flow
4. Check for technical issues
5. Pivot messaging if needed

---

## 📞 Weekly Review Questions

### Product
1. What's our activation rate?
2. Which features are most used?
3. Where do users drop off?

### Growth
1. What's our best acquisition channel?
2. What's our viral coefficient?
3. How is organic growth trending?

### Revenue
1. What's our conversion rate?
2. What's causing churn?
3. Which tier performs best?

### Next Week
1. What's the #1 growth bottleneck?
2. What experiment should we run?
3. What support issues are recurring?

---

**Remember**: 
- Track everything, but focus on 3-5 key metrics
- Daily habits beat weekly sprints
- Talk to users constantly
- Ship improvements daily

**North Star**: Weekly Active API Keys (users actually using the product with their keys)