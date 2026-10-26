import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
export function FoodImage({
  name,
  className,
  imagePath,
}: {
  name: string;
  className?: string;
  imagePath?: string | null;
}) {
  const [failed, setFailed] = useState(false);
  const image = useQuery({
    queryKey: ["food-photo", imagePath],
    enabled: Boolean(imagePath),
    staleTime: 3000000,
    retry: false,
    queryFn: async () => {
      if (!imagePath) return null;
      const { data, error } = await supabase.storage
        .from("meal-photos")
        .createSignedUrl(imagePath, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
  return (
    <img
      src={failed ? "/foods/custom-food.svg" : (image.data ?? foodPhoto(name))}
      alt={`${name} food photo`}
      loading="lazy"
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
