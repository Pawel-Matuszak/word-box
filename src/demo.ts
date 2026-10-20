import type { Bootstrap } from './types'

// Used when VITE_API_URL is not set, so the UI can be tried without a backend.
const rows: [string, string, string, string, string, string][] = [
  ['urge', 'pragnienie', 'Łatwe', 'Paweł', 'Poczułem nagłe pragnienie, żeby zjeść coś słodkiego.', 'I felt a sudden urge to eat something sweet.'],
  ['crucible', 'tygiel', 'Trudne', 'Paweł', 'Wojna była tyglem, w którym wykuł się jego charakter.', 'The war was the crucible in which his character was forged.'],
  ['cease to be', 'przestać być', 'Średnie', 'Paweł', 'Po fuzji stara firma przestała być niezależna.', 'After the merger, the old company ceased to be independent.'],
  ['emboldened', 'ośmielony', 'Trudne', 'Paweł', 'Ośmielony pierwszym sukcesem, złożył kolejną ofertę.', 'Emboldened by his first success, he made another offer.'],
  ['cerulean', 'lazurowy', 'Trudne', 'Paweł', 'Nad morzem rozciągało się błękitne, lazurowe niebo.', 'A cerulean sky stretched over the sea.'],
  ['robe', 'szata', 'Łatwe', 'Paweł', 'Czarodziej miał na sobie długą, ciemną szatę.', 'The wizard wore a long, dark robe.'],
  ['diligent', 'staranny', 'Trudne', 'Paweł', 'Jest staranną uczennicą i zawsze odrabia lekcje.', 'She is a diligent student and always does her homework.'],
  ['epitome', 'uosobienie', 'Trudne', 'Paweł', 'On jest uosobieniem dżentelmena.', 'He is the epitome of a gentleman.'],
  ['attire', 'strój', 'Średnie', 'Paweł', 'Na przyjęcie obowiązywał elegancki strój.', 'Formal attire was required at the reception.'],
  ['courtesy', 'kurtuazja', 'Łatwe', 'Paweł', 'Z kurtuazji przytrzymał jej drzwi.', 'Out of courtesy, he held the door for her.'],
  ['hunched', 'zgarbiony', 'Łatwe', 'Paweł', 'Starzec siedział zgarbiony nad książką.', 'The old man sat hunched over his book.'],
  ['vivid', 'żywy', 'Łatwe', 'Paweł', 'Mam żywe wspomnienia z dzieciństwa.', 'I have vivid memories of my childhood.'],
  ['dappled', 'pstrokaty', 'Trudne', 'Paweł', 'Pstrokate światło sączyło się przez liście.', 'Dappled light filtered through the leaves.'],
  ['acids', 'kwasy', 'Łatwe', 'Kinia', 'Silne kwasy mogą uszkodzić skórę.', 'Strong acids can damage the skin.'],
  ['circadian', 'dobowy', 'Średnie', 'Kinia', 'Praca zmianowa zaburza rytm dobowy.', 'Shift work disrupts the circadian rhythm.'],
  ['exacerbate', 'pogarszać', 'Trudne', 'Kinia', 'Stres może pogorszyć objawy choroby.', 'Stress can exacerbate the symptoms of the disease.'],
  ['exertion', 'wysiłek', 'Trudne', 'Kinia', 'Po takim wysiłku musisz odpocząć.', 'You need to rest after such exertion.'],
  ['muscle bulk', 'masa mięśniowa', 'Średnie', 'Kinia', 'Regularny trening zwiększa masę mięśniową.', 'Regular training increases muscle bulk.'],
  ['superstitious', 'przesądny', 'Średnie', 'Kinia', 'Jest tak przesądna, że boi się czarnych kotów.', 'She is so superstitious that she is afraid of black cats.'],
]

const categoryOf: Record<string, string> = {
  emboldened: 'Character', diligent: 'Character', courtesy: 'Character', superstitious: 'Character', epitome: 'Character',
  crucible: 'Fantasy', robe: 'Fantasy', attire: 'Fantasy',
  cerulean: 'Description', hunched: 'Description', vivid: 'Description', dappled: 'Description',
  acids: 'Health & body', circadian: 'Health & body', exacerbate: 'Health & body', exertion: 'Health & body', 'muscle bulk': 'Health & body',
}

export const demoData: Bootstrap = {
  words: rows.map(([word, translation, level, owner, example_pl, example_en], i) => ({
    id: i + 1,
    word,
    translation,
    level,
    owner,
    category: categoryOf[word] ?? '',
    notes: '',
    example_pl,
    example_en,
  })),
  levels: ['Łatwe', 'Średnie', 'Trudne'],
  owners: ['Paweł', 'Kinia'],
  categories: ['Character', 'Description', 'Fantasy', 'Health & body'],
  progress: [],
}
