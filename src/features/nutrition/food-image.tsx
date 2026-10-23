import { useState } from "react";
const foodPhotos: [RegExp, string][] = [
  [/banana|lakatan/i, "banana"],
  [/bread|pandesal/i, "bread"],
  [/sardine/i, "sardines"],
  [/adobo/i, "adobo"],
  [/chicken/i, "chicken"],
  [/rice/i, "rice"],
  [/egg/i, "egg"],
  [/milk/i, "milk"],
  [/vegetable/i, "vegetables"],
  [/monggo|mung/i, "monggo"],
  [/oat/i, "oatmeal"],
  [/peanut butter/i, "peanut-butter"],
  [/peanut/i, "peanuts"],
  [/sweet potato|kamote/i, "sweet-potato"],
  [/tilapia/i, "tilapia"],
  [/tofu/i, "tofu"],
  [/tuna/i, "tuna"],
];
export function foodPhoto(name: string) {
  const match = foodPhotos.find(([pattern]) => pattern.test(name));
  return match ? `/foods/${match[1]}.jpg` : "/foods/custom-food.svg";
}
export function FoodImage({ name, className }: { name: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <img
      src={failed ? "/foods/custom-food.svg" : foodPhoto(name)}
      alt={`${name} food illustration`}
      loading="lazy"
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
