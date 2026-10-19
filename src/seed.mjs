import { newSlide, BRAND_VERSION } from '../public/slides.js';
export function seedState() {
  const now = new Date().toISOString();
  const make = (recipe, data) => ({ ...newSlide(recipe), ...data });
  return {
    decks: [{ id: 'heymax-welcome', title: 'A little closer to your next story', description: 'Your HeyMax starter deck. Make it yours.', category: 'Brand story', starred: true, archived: false, brandVersion: BRAND_VERSION, rev: 1, createdAt: now, updatedAt: now, slides: [
      make('cover', { kicker: 'HEYMAX / A WORLD OF POSSIBILITY', title: 'Everyday moments.\nExtraordinary possibilities.', subtitle: 'A starting point for stories that take us further.' }),
      make('photo', { kicker: '01 / THE HUMAN STORY', title: 'There’s a whole\nworld out there.', subtitle: 'Warm, human, down to earth.', source: 'Photography and art direction: HeyMax external design system.' }),
      make('statement', { kicker: '02 / OUR PURPOSE', title: 'Turn everyday spending\ninto travel progress.', subtitle: 'A simpler connection between today and the next trip.', source: 'Positioning reference: HeyMax brand guideline. Review wording before external use.' }),
      make('cards', { kicker: '03 / HOW WE TELL OUR STORY', title: 'Clear. Confident. Human.', subtitle: 'A few principles to make every presentation feel like HeyMax.', items: [{ title: 'Keep it clear', body: 'Choose plain words. Make the benefit easy to understand.' }, { title: 'Make it real', body: 'Use human moments and approved product imagery.' }, { title: 'Give it purpose', body: 'Connect each idea to a meaningful next step.' }], source: 'Adapted from the HeyMax voice and photography guidelines.' }),
      make('partnership', { kicker: '04 / COLLABORATION', title: 'Better stories, together.', subtitle: 'A simple starting point for your next partnership conversation.' }),
      make('calendar', { kicker: '05 / THE CAMPAIGN PLAN' }),
      make('offers', { kicker: '06 / CREATIVE EXPLORATION', theme: 'lavender' }),
      make('closing', { subtitle: 'What story will you build next?' })
    ] }],
    knowledge: [{ id: 'heymax-voice', title: 'HeyMax voice and imagery', body: 'Use clear, confident, warm language. Avoid hype and unnecessary complexity. Photography should feel natural, human and relatable. Use the official wordmark rather than recreating the logo.', source: 'https://www.figma.com/design/osbBQgXRz6Rd19ZnuqMoWX/Design-System--external-?node-id=0-1', status: 'approved', updatedAt: now, reviewBy: '2027-01-18' }]
  };
}
