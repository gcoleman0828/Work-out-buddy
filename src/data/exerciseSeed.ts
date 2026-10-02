import { Equipment, MuscleGroup } from '@/constants/enums';

/**
 * Built-in exercise library. Doubles as the "known exercises" list that new
 * names are verified against (see SeedExerciseVerifier): a typed name that
 * matches one of these at >= the configured confidence is auto-filled from it.
 *
 * Instructions are short cues, not a substitute for the video link each
 * exercise gets. Images are not bundled yet (Phase 3 adds them as local files).
 * `aliases` are other common names, used only for matching.
 */
export interface SeedExercise {
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  instructions: string;
  aliases?: readonly string[];
}

export const EXERCISE_SEED: readonly SeedExercise[] = [
  {
    name: 'Jumping Jacks',
    muscleGroup: MuscleGroup.Cardio,
    equipment: Equipment.Bodyweight,
    instructions:
      'Stand tall, feet together, arms at your sides. Jump your feet out wide while swinging your arms overhead, then jump back to the start. Land softly on the balls of your feet and keep a steady rhythm.',
    aliases: ['star jumps'],
  },
  {
    name: 'Push-Up',
    muscleGroup: MuscleGroup.Chest,
    equipment: Equipment.Bodyweight,
    instructions:
      'Start in a high plank with hands just wider than shoulders. Keep your body in one straight line as you lower your chest to the floor, elbows about 45 degrees from your sides, then press back up.',
    aliases: ['press up', 'pushup'],
  },
  {
    name: 'Pull-Up',
    muscleGroup: MuscleGroup.Back,
    equipment: Equipment.Bodyweight,
    instructions:
      'Hang from a bar with an overhand grip a little wider than shoulders. Pull your chest toward the bar by driving your elbows down, pause at the top, then lower under control to a full hang.',
    aliases: ['pullup', 'chin up'],
  },
  {
    name: 'Bodyweight Squat',
    muscleGroup: MuscleGroup.Legs,
    equipment: Equipment.Bodyweight,
    instructions:
      'Stand with feet shoulder-width apart. Sit your hips back and down until your thighs are at least parallel to the floor, keeping your chest up and knees tracking over your toes, then drive through your heels to stand.',
    aliases: ['air squat'],
  },
  {
    name: 'Barbell Back Squat',
    muscleGroup: MuscleGroup.Legs,
    equipment: Equipment.Barbell,
    instructions:
      'Set the bar across your upper back, brace your core, and unrack. Sit down and back until your thighs are parallel or lower, keeping your whole foot planted and your torso tight, then stand by driving the floor away.',
    aliases: ['squat', 'back squat'],
  },
  {
    name: 'Barbell Bench Press',
    muscleGroup: MuscleGroup.Chest,
    equipment: Equipment.Barbell,
    instructions:
      'Lie on the bench with eyes under the bar, shoulder blades pinched together and feet planted. Lower the bar to your mid-chest under control, then press it back up over your shoulders. Use a spotter or safety arms for heavy sets.',
    aliases: ['bench press', 'bench'],
  },
  {
    name: 'Conventional Deadlift',
    muscleGroup: MuscleGroup.Back,
    equipment: Equipment.Barbell,
    instructions:
      'Stand with the bar over mid-foot, hinge down and grip just outside your legs. Brace, keep your back flat, and push the floor away as you stand tall, then lower the bar by hinging at the hips with it close to your legs.',
    aliases: ['deadlift'],
  },
  {
    name: 'Overhead Press',
    muscleGroup: MuscleGroup.Shoulders,
    equipment: Equipment.Barbell,
    instructions:
      'Hold the bar at collarbone height with elbows slightly in front. Squeeze your glutes and press the bar straight up, moving your head through at the top, and lock out over mid-foot before lowering back to your shoulders.',
    aliases: ['military press', 'shoulder press', 'ohp'],
  },
  {
    name: 'Barbell Row',
    muscleGroup: MuscleGroup.Back,
    equipment: Equipment.Barbell,
    instructions:
      'Hinge forward with a flat back and the bar hanging at arm length. Pull the bar to your lower ribs by driving your elbows back, squeeze your shoulder blades, then lower with control without standing up between reps.',
    aliases: ['bent over row'],
  },
  {
    name: 'Dumbbell Shoulder Press',
    muscleGroup: MuscleGroup.Shoulders,
    equipment: Equipment.Dumbbell,
    instructions:
      'Sit or stand with a dumbbell at each shoulder, palms forward. Press both overhead until your arms are straight, then lower to shoulder height. Keep your ribs down and avoid arching your lower back.',
  },
  {
    name: 'Dumbbell Bicep Curl',
    muscleGroup: MuscleGroup.Arms,
    equipment: Equipment.Dumbbell,
    instructions:
      'Stand with a dumbbell in each hand, elbows pinned to your sides. Curl the weights up by bending only at the elbow, squeeze at the top, then lower fully without swinging your torso.',
    aliases: ['bicep curl', 'biceps curl', 'curl'],
  },
  {
    name: 'Tricep Dip',
    muscleGroup: MuscleGroup.Arms,
    equipment: Equipment.Bodyweight,
    instructions:
      'Support yourself on parallel bars or a bench edge with arms straight. Lower by bending your elbows back until your upper arms are about parallel to the floor, then press up. Keep your shoulders down and away from your ears.',
    aliases: ['dips', 'bench dip'],
  },
  {
    name: 'Lat Pulldown',
    muscleGroup: MuscleGroup.Back,
    equipment: Equipment.Cable,
    instructions:
      'Sit with your thighs secured under the pad and grip the bar wider than shoulders. Pull the bar to your upper chest by driving your elbows down and back, then let it rise slowly until your arms are straight.',
  },
  {
    name: 'Leg Press',
    muscleGroup: MuscleGroup.Legs,
    equipment: Equipment.Machine,
    instructions:
      'Sit with your back flat against the pad and feet shoulder-width on the platform. Lower the platform until your knees are near 90 degrees without your hips curling off the seat, then press back up without locking your knees hard.',
  },
  {
    name: 'Walking Lunge',
    muscleGroup: MuscleGroup.Legs,
    equipment: Equipment.Bodyweight,
    instructions:
      'Step forward into a long stride and lower until both knees are about 90 degrees, back knee just above the floor. Push through the front heel to bring your rear foot forward into the next step, keeping your torso upright.',
    aliases: ['lunge', 'lunges'],
  },
  {
    name: 'Hip Thrust',
    muscleGroup: MuscleGroup.Glutes,
    equipment: Equipment.Barbell,
    instructions:
      'Sit with your upper back against a bench and the bar over your hips. Drive through your heels to lift your hips until your torso is level with the floor, squeeze your glutes at the top, then lower under control.',
    aliases: ['glute bridge thrust'],
  },
  {
    name: 'Standing Calf Raise',
    muscleGroup: MuscleGroup.Legs,
    equipment: Equipment.Machine,
    instructions:
      'Stand with the balls of your feet on a platform and heels hanging off. Rise as high as you can onto your toes, pause, then lower your heels below the platform for a full stretch.',
    aliases: ['calf raise'],
  },
  {
    name: 'Plank',
    muscleGroup: MuscleGroup.Core,
    equipment: Equipment.Bodyweight,
    instructions:
      'Rest on your forearms and toes with elbows under shoulders. Keep your body in a straight line from head to heels, brace your abs and squeeze your glutes. Do not let your hips sag or pike.',
    aliases: ['forearm plank'],
  },
  {
    name: 'Sit-Up',
    muscleGroup: MuscleGroup.Core,
    equipment: Equipment.Bodyweight,
    instructions:
      'Lie on your back with knees bent and feet flat. Curl your torso up until your chest nears your thighs, then lower with control. Keep your neck relaxed and avoid pulling on your head.',
    aliases: ['situp', 'sit ups'],
  },
  {
    name: 'Crunch',
    muscleGroup: MuscleGroup.Core,
    equipment: Equipment.Bodyweight,
    instructions:
      'Lie on your back with knees bent and hands by your temples. Lift your shoulder blades off the floor by curling your ribs toward your hips, pause, and lower slowly. The range is small; focus on the abs, not momentum.',
    aliases: ['ab crunch'],
  },
  {
    name: 'Mountain Climber',
    muscleGroup: MuscleGroup.Core,
    equipment: Equipment.Bodyweight,
    instructions:
      'Start in a high plank. Drive one knee toward your chest, then switch legs quickly in a running motion while keeping your hips low and shoulders over your hands.',
    aliases: ['mountain climbers'],
  },
  {
    name: 'Burpee',
    muscleGroup: MuscleGroup.FullBody,
    equipment: Equipment.Bodyweight,
    instructions:
      'From standing, drop your hands to the floor and jump your feet back to a plank. Lower your chest down, push up, jump your feet back under you, then explode into a small jump with arms overhead.',
    aliases: ['burpees'],
  },
  {
    name: 'Kettlebell Swing',
    muscleGroup: MuscleGroup.Glutes,
    equipment: Equipment.Kettlebell,
    instructions:
      'Stand with feet wider than shoulders and the kettlebell on the floor ahead of you. Hinge, hike the bell back between your legs, then snap your hips forward so the bell floats to chest height. Let it fall back and hinge again; the power comes from your hips, not your arms.',
    aliases: ['kb swing'],
  },
  {
    name: 'Running',
    muscleGroup: MuscleGroup.Cardio,
    equipment: Equipment.Other,
    instructions:
      'Keep a tall posture with a slight forward lean, relaxed shoulders and a quick, light cadence. Land under your hips rather than reaching forward, and breathe at a pace you could hold a short sentence at.',
    aliases: ['run', 'jogging', 'jog'],
  },
  {
    name: 'Cycling',
    muscleGroup: MuscleGroup.Cardio,
    equipment: Equipment.Cardio,
    instructions:
      'Set the saddle so your knee has a slight bend at the bottom of the pedal stroke. Keep your hands and shoulders relaxed and pedal in smooth circles at a cadence you can sustain.',
    aliases: ['bike', 'biking', 'stationary bike'],
  },
  {
    name: 'Rowing Machine',
    muscleGroup: MuscleGroup.FullBody,
    equipment: Equipment.Cardio,
    instructions:
      'Drive with your legs first, then lean back slightly and pull the handle to your lower ribs. Reverse the order on the way back: arms, torso, then bend your knees. Keep the stroke smooth and rhythmic.',
    aliases: ['rower', 'row machine', 'erg'],
  },
];
