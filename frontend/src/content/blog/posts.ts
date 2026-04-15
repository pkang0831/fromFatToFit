export type BlogSection =
  | {
      type: 'paragraphs';
      title?: string;
      paragraphs: string[];
    }
  | {
      type: 'list';
      title?: string;
      intro?: string;
      items: string[];
      outro?: string;
    }
  | {
      type: 'quote';
      quote: string;
      attribution?: string;
    };

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  socialDescription: string;
  date: string;
  readingTime: string;
  tags: string[];
  heroImage: string;
  heroAlt: string;
  deck: string;
  ctaTitle: string;
  ctaBody: string;
  sections: BlogSection[];
}

const posts: BlogPost[] = [
  {
    slug: 'why-i-built-devenira-for-the-weeks-where-you-want-to-quit',
    title: 'Why I Built Devenira for the Weeks Where You Want to Quit',
    description:
      'I lost 50kg, but the hardest part was not starting. It was the slow middle where progress was real, but hard to trust. That is why I built Devenira around weekly proof.',
    socialDescription:
      'Most people do not quit because nothing is happening. They quit because panic gets there before proof. This is the story behind Devenira.',
    date: '2026-04-15',
    readingTime: '8 min read',
    tags: ['Founder Story', 'Weight Loss', 'Transformation', 'Body Image'],
    heroImage: '/founder/final-portrait.jpg',
    heroAlt: 'Founder portrait after a major body transformation',
    deck:
      'I did not build Devenira because I wanted another fitness app. I built it because the hardest part of losing 50kg was not starting. It was the long middle where the work was real, but the mirror still made it feel fake.',
    ctaTitle: 'Start with one body check-in.',
    ctaBody:
      'If the mirror is louder than the evidence right now, begin with one scan and build a weekly record you can trust.',
    sections: [
      {
        type: 'paragraphs',
        paragraphs: [
          'I did not build Devenira because AI is interesting.',
          'I built it because the mirror can become a liar when you see it every day.',
          'People like to talk about weight loss as if the hard part is starting. Eat better. Train harder. Stay disciplined.',
          'That is part of it, yes. But for me, the hardest part was never the beginning. It was the middle.',
        ],
      },
      {
        type: 'quote',
        quote: 'Maybe nothing is changing.',
      },
      {
        type: 'paragraphs',
        paragraphs: [
          'That thought is more dangerous than people realize.',
          'Because once your brain starts believing that the effort is invisible, quitting starts sounding rational. Not lazy. Rational.',
        ],
      },
      {
        type: 'paragraphs',
        title: 'This Is Where the Story Actually Starts',
        paragraphs: [
          'At the start, the problem is obvious. You know you need to change. You know how uncomfortable you feel. You know the current version of yourself is not where you want to stay.',
          'That part is painful, but at least it is clear. The strange thing about body change is that clarity gets weaker before the results get stronger.',
          'You can lose weight. You can train consistently. You can clean up your habits. And still wake up one morning feeling like your body looks exactly the same.',
          'That is when people do stupid things. They overreact to one weigh-in. They assume one flat-looking mirror day means the process failed. They start changing the plan every week because they need proof faster than their body is willing to show it.',
          'That is where a lot of transformations quietly die. Not because the body stopped changing. Because belief did.',
        ],
      },
      {
        type: 'paragraphs',
        title: 'The Middle Looked Ordinary',
        paragraphs: [
          'The middle of my own transformation did not look cinematic. It did not feel like a movie montage. It looked ordinary.',
          'That was the problem. Ordinary progress is easy to dismiss.',
          'The final result is obvious in hindsight. But while you are still inside the process, change is subtle. It shows up in pieces. A little more shape here. A little less softness there. A slightly different waistline. A slightly different face.',
          'The mirror is bad at telling that story. It only shows you one emotional frame at a time. And if you are tired, stressed, bloated, flat, or second-guessing yourself, that frame can become a false verdict.',
          'That is what I mean when I say the mirror gets loud before the proof does.',
        ],
      },
      {
        type: 'paragraphs',
        title: 'It Changed in Phases',
        paragraphs: [
          'What I wish I had back then was not more motivation.',
          'I did not need another quote. I did not need another calorie target. I did not need another app trying to be everything at once. I needed better evidence.',
          'I needed a way to see that the process was moving, even before it looked dramatic.',
          'That is what people misunderstand about transformation stories. They think the most important contrast is before and after. It is not. The most important stretch is before and during.',
          'That is the stretch where belief is fragile. That is where the whole thing is most likely to collapse. And that is exactly why I care so much about weekly check-ins.',
        ],
      },
      {
        type: 'paragraphs',
        title: 'One Photo Is a Moment. A Weekly Record Is a Story',
        paragraphs: [
          'A single photo can help. But a single photo still leaves too much room for denial.',
          'One good angle can flatter you. One bad angle can crush you. One good weigh-in can make you overconfident. One bad weigh-in can make you want to disappear.',
          'What changed the way I think about progress is this: one measurement is data. A repeated record is evidence.',
          'That is the difference between chasing reassurance and building proof.',
          'If you return weekly, under roughly the same conditions, the story gets harder to distort. You stop relying on memory. You stop relying on one emotional morning. You stop asking the mirror to carry a job it was never good at.',
          'You build a record. And once a record exists, panic has less room to improvise.',
        ],
      },
      {
        type: 'paragraphs',
        title: 'Why Devenira Exists',
        paragraphs: [
          'That is the gap Devenira is meant to fill. Not as another giant fitness dashboard. Not as a medical device. Not as a fake instant-transformation machine.',
          'But as a weekly proof loop.',
          'You check in. You see where you are. You come back. You compare. And over time, the process becomes harder to gaslight yourself about.',
          'That matters more than people think. Most people do not fail because nothing is happening. They fail because panic gets there before proof.',
        ],
      },
      {
        type: 'paragraphs',
        title: 'Proof Over Panic',
        paragraphs: [
          'That phrase is not just branding to me. It is the reason the product exists at all.',
          'I know what it feels like to be in the middle of a cut, or in the middle of a long body change, and to wonder whether the whole thing is a delusion. I know what it feels like to need evidence, not encouragement.',
          'So if Devenira does its job well, it should not just collect information. It should make the hard middle easier to survive. It should help you trust the process long enough to let the process become visible.',
          'If you are in that phase right now, the one where you are doing the work but struggling to believe it, start with one body check-in. One scan is a number. Weekly check-ins are proof.',
        ],
      },
    ],
  },
  {
    slug: 'why-the-mirror-can-make-real-progress-feel-fake',
    title: 'Why the Mirror Can Make Real Progress Feel Fake',
    description:
      'The mirror is one of the worst tools for judging body change in real time. Here is why progress can be real even when it still feels invisible.',
    socialDescription:
      'Progress can be real before it feels obvious. The mirror is often the last place to give clear feedback.',
    date: '2026-04-16',
    readingTime: '6 min read',
    tags: ['Body Image', 'Progress Tracking', 'Weight Loss', 'Dieting'],
    heroImage: '/founder/start.jpg',
    heroAlt: 'Founder-style mirror image representing a weekly body check-in',
    deck:
      'If you see your body every day, the mirror is often the last place that will give you reassurance. That does not mean progress is not happening. It means the mirror is a terrible historian.',
    ctaTitle: 'Start with one body check-in.',
    ctaBody:
      'If the mirror is noisy right now, use one scan as a baseline and start building a visual record you can actually trust.',
    sections: [
      {
        type: 'paragraphs',
        paragraphs: [
          'The mirror is one of the worst places to look for reassurance during body change.',
          'Not because it always lies. But because it adapts too well.',
          'When you see your body every day, small differences stop feeling like differences. That is why people can be making real progress and still feel stuck.',
          'This is where a lot of diets actually fail. Not in physiology. In interpretation.',
        ],
      },
      {
        type: 'paragraphs',
        title: 'The Mirror Only Shows One Emotional Frame',
        paragraphs: [
          'The mirror does not show trend. It does not show context. It does not show comparison. It shows one moment.',
          'And that one moment is easy to misread.',
          'If you are flat, tired, bloated, stressed, underslept, or disappointed, the mirror becomes an amplifier for whatever story you are already telling yourself.',
          'That is why the same body can look “better” one day and “worse” the next, even when almost nothing meaningful has changed.',
        ],
      },
      {
        type: 'paragraphs',
        title: 'Daily Exposure Makes Change Harder To Notice',
        paragraphs: [
          'People underestimate how much familiarity distorts perception.',
          'The body changes slowly. The eyes adapt quickly. That is a bad combination.',
          'When the change is gradual, your brain normalizes it before your confidence catches up. So even when the process is working, the visible reward can feel delayed.',
          'That delay is dangerous. Because once you start thinking nothing is happening, the next bad meal, bad weigh-in, or bad mirror day suddenly feels like proof that the whole thing failed.',
        ],
      },
      {
        type: 'paragraphs',
        title: 'This Is Why Progress Often Feels Fake In The Middle',
        paragraphs: [
          'The beginning is clear. You know you want change. You know why you started.',
          'The ending is also clear. You can look back and say, yes, that was real.',
          'But the middle is where doubt lives. The middle is subtle. The middle looks ordinary. The middle is easy to dismiss.',
          'That is exactly why so many people quit there. Not because nothing is happening. Because they cannot trust what is happening.',
        ],
      },
      {
        type: 'list',
        title: 'What Works Better Than The Mirror',
        intro:
          'If you want to judge progress more honestly, you need better evidence than one emotional look in the bathroom mirror.',
        items: [
          'progress photos across real time gaps',
          'weekly comparison, not daily obsession',
          'stable conditions as often as possible',
          'a visual record you can revisit',
        ],
        outro:
          'One photo is still just one moment. But repeated photos become a story. And stories are harder to distort than moods.',
      },
      {
        type: 'paragraphs',
        title: 'One Moment Is Data. A Record Is Evidence',
        paragraphs: [
          'A single look in the mirror is data. A stored visual timeline is evidence.',
          'Evidence matters because it protects you from panic. It keeps you from overreacting to one bad day. It reminds you that change can be real before it feels dramatic. And it gives you something more stable than memory to rely on.',
        ],
      },
      {
        type: 'paragraphs',
        title: 'That Is Why Weekly Check-Ins Matter',
        paragraphs: [
          'I care much more about weekly proof than daily reassurance. Daily reassurance is fragile. Weekly proof compounds.',
          'When you check in on a weekly cadence, you give your body enough time to show direction. That direction is what keeps people going.',
          'Not hype. Not discipline theater. Not pretending doubt never shows up. Just better evidence.',
          'If the mirror feels discouraging right now, that does not automatically mean the process is failing. It may just mean you are too close to the change to see it clearly yet.',
          'That is why one of the best things you can do is stop asking the mirror to tell the whole story. Build a record instead. One scan is a number. Weekly check-ins are proof.',
        ],
      },
    ],
  },
  {
    slug: 'one-emotional-weigh-in-can-wreck-a-good-week',
    title: 'One Emotional Weigh-In Can Wreck a Good Week',
    description:
      'One weigh-in can trigger panic even when your fat loss is still on track. Here is why scale spikes happen and how to interpret them better.',
    socialDescription:
      'A single scale increase can ruin a good week if you let panic tell the story. Better interpretation matters as much as better habits.',
    date: '2026-04-17',
    readingTime: '6 min read',
    tags: ['Scale Weight', 'Fat Loss', 'Dieting', 'Weight Loss'],
    heroImage: '/founder/start.jpg',
    heroAlt: 'Mirror check-in image used to represent better tracking beyond the scale',
    deck:
      'The scale is not useless. But one loud reading can trigger a lot of bad decisions if you let it become a verdict instead of a data point.',
    ctaTitle: 'Use better evidence than one weigh-in.',
    ctaBody:
      'Start with one body check-in, then compare week by week instead of letting one loud scale reading define the whole process.',
    sections: [
      {
        type: 'paragraphs',
        paragraphs: [
          'Most people do not ruin a good week because of one number.',
          'They ruin it because of the story they attach to that number.',
          'The scale goes up. Panic starts. And suddenly one careful week feels fake.',
          'That is how people turn noise into a conclusion.',
        ],
      },
      {
        type: 'paragraphs',
        title: 'The Dangerous Part Is Not The Reading',
        paragraphs: [
          'The dangerous part is interpretation.',
          'A scale spike feels absolute. It feels objective. It feels like the body is delivering a verdict.',
          'But scale weight is not body fat.',
          'It is body fat, yes, but also water, digestion, food volume, sodium, timing, inflammation, stress, sleep, bowel movement timing, and a dozen other temporary variables.',
          'That is why you can eat less and still weigh more the next day. Not because your body broke the laws of physics. Because the scale measures more than the story you want it to tell.',
        ],
      },
      {
        type: 'paragraphs',
        title: 'One Reading Is Too Small To Carry A Verdict',
        paragraphs: [
          'One weigh-in can be useful. But it is too small to carry a conclusion about whether your whole process is working.',
          'Think about how often people do this: one up day means I am gaining fat, one flat day means nothing is changing, one low day means finally it is working.',
          'That is emotional accounting, not analysis. The scale becomes dangerous when you ask it to explain more than it can explain.',
        ],
      },
      {
        type: 'list',
        title: 'Why People Spiral After A Scale Spike',
        intro: 'The scale itself is not the whole problem. The problem is what usually comes next.',
        items: [
          'restriction',
          'punishment cardio',
          'bingeing because the week is ruined anyway',
          'changing the whole plan too early',
        ],
        outro:
          'That is how one noisy morning turns into several genuinely bad days. The irony is that the original spike often did less damage than the overreaction that followed it.',
      },
      {
        type: 'list',
        title: 'Better Questions To Ask',
        intro: 'When the scale goes up, ask better questions before you panic.',
        items: [
          'How have the last 7 days looked, not just today?',
          'Was yesterday high in sodium or food volume?',
          'Am I more stressed or less rested than usual?',
          'Have I actually gathered enough data to call this a trend?',
        ],
        outro:
          'Most of the time, the answer is no. And that matters. Because not enough data yet is a much healthier conclusion than this is not working.',
      },
      {
        type: 'list',
        title: 'The Scale Needs Context',
        intro: 'The scale becomes far more useful when you pair it with other signals.',
        items: [
          'weekly averages',
          'photos across real time gaps',
          'visual changes in the waist, face, and torso',
          'whether your routine is still consistent',
        ],
        outro:
          'That is what keeps one weigh-in from becoming an emotional referendum on your whole effort.',
      },
      {
        type: 'paragraphs',
        title: 'Why Visual Proof Helps',
        paragraphs: [
          'If the scale is noisy, visual proof helps calm interpretation.',
          'A progress record does not remove uncertainty completely. But it gives you something steadier than one morning number.',
          'It lets you zoom out. It helps you see whether the direction is real. And it protects you from treating every fluctuation like a crisis.',
          'This is one of the reasons weekly check-ins matter so much. They create enough space for change to become visible, and enough structure to stop panic from making the call.',
        ],
      },
      {
        type: 'paragraphs',
        title: 'Closing',
        paragraphs: [
          'The scale can be noisy without being useless.',
          'The mistake is turning one noisy reading into a verdict.',
          'If you want better decisions, you need better evidence than one emotional morning.',
          'One scan is a number. Weekly check-ins are proof.',
        ],
      },
    ],
  },
  {
    slug: 'how-to-track-body-transformation-without-obsessing-over-the-scale',
    title: 'How to Track Body Transformation Without Obsessing Over the Scale',
    description:
      'If you want to track body transformation more accurately, you need better signals than daily scale obsession. Here is a simpler way to do it.',
    socialDescription:
      'You do not need more data. You need a better system for judging whether your body is actually changing.',
    date: '2026-04-18',
    readingTime: '7 min read',
    tags: ['Transformation', 'Progress Photos', 'Body Composition', 'Fat Loss'],
    heroImage: '/founder/final-body.jpg',
    heroAlt: 'Founder physique image used to represent body transformation progress',
    deck:
      'If you want to know whether your body is actually changing, you need a better system than checking the scale and the mirror every day. A simple weekly evidence loop works better.',
    ctaTitle: 'Track transformation with better evidence.',
    ctaBody:
      'Start with one body check-in and build a weekly record that is harder to distort than a single mirror glance or scale reading.',
    sections: [
      {
        type: 'paragraphs',
        paragraphs: [
          'Most people try to track transformation with the same two tools: the scale and the mirror.',
          'The problem is not that those tools are useless. The problem is that people use them badly.',
          'They look too often. They react too quickly. And they ask each tool to do more than it is good at.',
          'That is how progress becomes confusing, even when the process is working.',
        ],
      },
      {
        type: 'paragraphs',
        title: 'What Most People Get Wrong',
        paragraphs: [
          'The most common mistake is turning a body transformation into a daily judgment ritual.',
          'You weigh yourself. You look in the mirror. You decide how hopeful or hopeless to feel.',
          'That is not tracking. That is emotional volatility with numbers attached to it.',
          'The scale is too noisy for daily interpretation. The mirror is too familiar for subtle change.',
          'If you rely on those two alone, you will keep bouncing between overconfidence and discouragement.',
        ],
      },
      {
        type: 'list',
        title: 'What Better Tracking Actually Looks Like',
        intro:
          'A useful transformation-tracking system does three things.',
        items: [
          'it creates a baseline',
          'it compares over meaningful gaps',
          'it reduces the room for panic-driven interpretation',
        ],
        outro:
          'That is why a weekly system works so well. It is frequent enough to stay relevant, but slow enough to let your body show direction.',
      },
      {
        type: 'paragraphs',
        title: 'Start With A Real Baseline',
        paragraphs: [
          'You need one honest starting point.',
          'Not a flattering photo. Not your best angle. Not the version of your body you wish were true.',
          'Just a clear starting point.',
          'That is what gives every future check-in meaning. Without a baseline, every new photo becomes a guess. With a baseline, each new check-in becomes comparison.',
        ],
      },
      {
        type: 'paragraphs',
        title: 'Why Weekly Check-Ins Work Better',
        paragraphs: [
          'Weekly check-ins are better than daily obsession for one simple reason: the body usually changes slower than emotion.',
          'Daily tracking gives emotion too many chances to interfere. Weekly tracking gives the body more room to tell a real story.',
          'That does not mean every week looks dramatic. It means weekly data is more likely to mean something.',
          'Because one of the biggest reasons people quit is not lack of discipline. It is lack of believable evidence.',
        ],
      },
      {
        type: 'list',
        title: 'The Best Signals To Track',
        items: [
          'weekly progress photos',
          'visual changes in waist, torso, face, and posture',
          'repeated check-ins under roughly similar conditions',
          'the scale as a supporting metric, not the main judge',
        ],
        outro:
          'This gives you a more stable read on reality. You stop trying to squeeze certainty out of one daily number.',
      },
      {
        type: 'paragraphs',
        title: 'Progress Photos Matter More Than People Admit',
        paragraphs: [
          'A lot of people avoid progress photos because they feel awkward or discouraging. That is understandable.',
          'But the uncomfortable truth is that progress photos often become useful before they become flattering.',
          'That is exactly why they matter. They capture what memory edits. They preserve what the mirror normalizes. And over time, they become one of the clearest ways to see whether the work is paying off.',
        ],
      },
      {
        type: 'paragraphs',
        title: 'You Do Not Need More Data. You Need Better Interpretation',
        paragraphs: [
          'Most people are not short on information. They are short on structure.',
          'They do not need more dashboards. They do not need a more dramatic chart. They do not need to check five times a day.',
          'They need a system that makes panic less persuasive. That is what a weekly proof loop does.',
          'It gives you enough information to see direction. And it keeps that direction visible long enough for your confidence to catch up.',
        ],
      },
      {
        type: 'paragraphs',
        title: 'Closing',
        paragraphs: [
          'If you want to track body transformation without obsessing over the scale, simplify the system.',
          'Start with one baseline. Check in weekly. Store the record. Compare over time.',
          'That is a much better way to judge whether your body is changing.',
          'One scan is a number. Weekly check-ins are proof.',
        ],
      },
    ],
  },
];

export function getAllBlogPosts() {
  return [...posts].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getBlogPostBySlug(slug: string) {
  return posts.find((post) => post.slug === slug);
}

export function getRelatedBlogPosts(slug: string, limit = 3) {
  return getAllBlogPosts()
    .filter((post) => post.slug !== slug)
    .slice(0, limit);
}
