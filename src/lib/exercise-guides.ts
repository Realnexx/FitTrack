export interface ExerciseGuide {
  slug: string;
  extension: "jpg" | "svg";
  steps: string[];
  cue: string;
  captions: [string, string];
  sourceId?: string;
  note?: string;
}
export const exerciseGuides: Record<string, ExerciseGuide> = {
  "Goblet Squat": {
    slug: "goblet-squat",
    extension: "jpg",
    sourceId: "Goblet_Squat",
    captions: ["Stand and brace", "Sit down between your hips"],
    note: "Kettlebell variation shown. For your dumbbell plan, hold one dumbbell vertically at your chest.",
    steps: [
      "Stand with feet about shoulder-width apart and hold one dumbbell vertically at your chest.",
      "Brace your trunk and bend your hips and knees, keeping your heels down.",
      "Lower as far as you can comfortably control, with knees following the direction of your toes.",
      "Push through your whole foot to stand, keeping the dumbbell close to your chest.",
    ],
    cue: "Keep your chest tall and avoid letting your knees collapse inward.",
  },
  "Dumbbell Floor Press": {
    slug: "floor-press",
    extension: "jpg",
    sourceId: "Dumbbell_Floor_Press",
    captions: ["Press above your chest", "Lower until upper arms meet the floor"],
    steps: [
      "Lie on your back on the floor, with a dumbbell in each hand and wrists stacked over your elbows.",
      "Keep your upper arms slightly away from your torso and lower until they gently touch the floor.",
      "Press both dumbbells above your chest without bouncing your arms off the floor.",
      "Lower slowly to repeat; use a controlled range rather than forcing extra depth.",
    ],
    cue: "Keep wrists straight and shoulders steady.",
  },
  "One-Arm Dumbbell Row": {
    slug: "one-arm-row",
    extension: "jpg",
    sourceId: "One-Arm_Dumbbell_Row",
    captions: ["Support yourself and let the arm hang", "Draw the dumbbell toward your hip"],
    steps: [
      "Support one hand and knee on a stable bench, with your other foot firmly on the floor.",
      "Keep your back neutral and let the dumbbell hang below your shoulder.",
      "Pull your elbow toward your hip without twisting your torso.",
      "Lower under control and repeat, then switch sides.",
    ],
    cue: "Keep your hips square; move the arm without jerking your body.",
  },
  "Dumbbell Biceps Curl": {
    slug: "biceps-curl",
    extension: "jpg",
    sourceId: "Dumbbell_Bicep_Curl",
    captions: ["Arms by your sides", "Curl with elbows kept close"],
    steps: [
      "Stand tall with a dumbbell in each hand, palms facing forward.",
      "Keep your elbows near your ribs and your upper arms still.",
      "Bend your elbows to curl the weights toward your shoulders.",
      "Lower slowly until your arms are almost straight, then repeat.",
    ],
    cue: "Avoid swinging your torso to lift the weights.",
  },
  "Dumbbell Romanian Deadlift": {
    slug: "romanian-deadlift",
    extension: "jpg",
    sourceId: "Stiff-Legged_Dumbbell_Deadlift",
    captions: ["Stand with a soft knee bend", "Hinge back with weights close to your legs"],
    note: "Stiff-legged dumbbell variation shown. For the Romanian deadlift, keep a soft knee bend throughout the hinge.",
    steps: [
      "Stand with feet about hip-width apart, holding dumbbells in front of your thighs.",
      "Keep a small bend in your knees and push your hips backward.",
      "Lower the weights close to your legs while keeping your back neutral; stop before your back rounds.",
      "Drive your hips forward to stand tall without leaning backward at the top.",
    ],
    cue: "Think hips back, not squat down. Keep the weights close to your shins.",
  },
  "Dumbbell Shoulder Press": {
    slug: "shoulder-press",
    extension: "jpg",
    sourceId: "Dumbbell_Shoulder_Press",
    captions: ["Start near shoulder height", "Press overhead with control"],
    note: "Seated variation shown. You can also stand with your trunk braced.",
    steps: [
      "Sit against a stable backrest or stand tall, holding the dumbbells near shoulder height.",
      "Brace your trunk and keep your wrists above your elbows.",
      "Press upward through a comfortable range without arching your lower back.",
      "Lower the dumbbells slowly to shoulder height and repeat.",
    ],
    cue: "Keep your ribs down rather than leaning backward.",
  },
  "Dumbbell Reverse Lunge": {
    slug: "reverse-lunge",
    extension: "jpg",
    sourceId: "Dumbbell_Rear_Lunge",
    captions: ["Stand tall with weights by your sides", "Step backward and lower under control"],
    steps: [
      "Stand with feet about hip-width apart and a dumbbell in each hand.",
      "Step one foot backward, keeping enough width to stay balanced.",
      "Bend both knees and lower your back knee toward the floor while keeping the front foot planted.",
      "Push through the front foot to return to standing; repeat on the other side.",
    ],
    cue: "Keep your front knee tracking over your foot, and avoid a tightrope stance.",
  },
  "Forearm Plank": {
    slug: "plank",
    extension: "jpg",
    sourceId: "Plank",
    captions: [
      "Kneel to prepare for the hold",
      "Set elbows under shoulders and hold a straight line",
    ],
    steps: [
      "Place your forearms on the floor with elbows under your shoulders.",
      "Step your feet back and lift your knees so your weight rests on forearms and toes.",
      "Brace your abdomen and glutes to keep your head, hips and heels in one line.",
      "Breathe steadily for the recorded duration; lower your knees when you can no longer hold that position.",
    ],
    cue: "Avoid letting your hips sag or lifting them into a pike.",
  },
  "Push-Up": {
    slug: "push-up",
    extension: "jpg",
    sourceId: "Pushups",
    captions: ["Brace in a high plank", "Lower your chest as one unit"],
    steps: [
      "Place your hands slightly wider than shoulder-width and extend your legs into a high plank.",
      "Brace your trunk so your shoulders, hips and heels move together.",
      "Bend your elbows and lower your chest toward the floor with control.",
      "Press the floor away to return to your starting position.",
    ],
    cue: "Keep your elbows angled back rather than flared straight out.",
  },
  "Dumbbell Lateral Raise": {
    slug: "lateral-raise",
    extension: "jpg",
    sourceId: "Side_Lateral_Raise",
    captions: ["Start with weights by your sides", "Raise arms to about shoulder height"],
    steps: [
      "Stand tall with light dumbbells by your sides and a small bend in your elbows.",
      "Raise your arms out to the sides, slightly forward of your torso.",
      "Stop around shoulder height or at a lower comfortable range.",
      "Lower slowly while keeping your shoulders relaxed and torso still.",
    ],
    cue: "Lead with your elbows and avoid shrugging or swinging.",
  },
  "Dumbbell Triceps Extension": {
    slug: "triceps-extension",
    extension: "jpg",
    sourceId: "Standing_Dumbbell_Triceps_Extension",
    captions: ["Extend the dumbbell overhead", "Bend elbows to lower it behind your head"],
    steps: [
      "Hold one dumbbell with both hands above your head, with your trunk braced.",
      "Keep your upper arms relatively still and bend your elbows to lower the weight behind your head.",
      "Lower only through a comfortable shoulder and elbow range.",
      "Straighten your elbows to bring the dumbbell overhead, then repeat.",
    ],
    cue: "Keep your ribs down and avoid letting your upper arms flare widely.",
  },
  "Dumbbell Calf Raise": {
    slug: "calf-raise",
    extension: "jpg",
    sourceId: "Standing_Dumbbell_Calf_Raise",
    captions: ["Stand with feet stable", "Rise onto the balls of your feet"],
    steps: [
      "Stand on a stable surface with a dumbbell in each hand.",
      "Keep your knees softly extended and raise your heels by pressing through the balls of your feet.",
      "Pause briefly at the top while staying balanced.",
      "Lower your heels slowly and repeat. A stable step is optional for extra range.",
    ],
    cue: "Move straight up and down without rolling your ankles outward.",
  },
};
export function getExerciseGuide(name: string) {
  return exerciseGuides[name] ?? (name === "Plank" ? exerciseGuides["Forearm Plank"] : undefined);
}
