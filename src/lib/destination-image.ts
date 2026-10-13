import heroJaipur from "@/assets/hero-jaipur.jpg";
import heroKerala from "@/assets/hero-kerala.jpg";
import heroLadakh from "@/assets/hero-ladakh.jpg";
import heroTaj from "@/assets/hero-taj.jpg";
import destGoa from "@/assets/dest-goa.jpg";
import destJaisalmer from "@/assets/dest-jaisalmer.jpg";
import destManali from "@/assets/dest-manali.jpg";
import destRishikesh from "@/assets/dest-rishikesh.jpg";
import destUdaipur from "@/assets/dest-udaipur.jpg";
import destVaranasi from "@/assets/dest-varanasi.jpg";

const DESTINATION_PHOTOS = [
  { match: /udaipur|lake city/i, src: destUdaipur },
  { match: /jaisalmer|desert|bikaner|kutch/i, src: destJaisalmer },
  { match: /goa|beach|island|maldives|bali|phuket|varkala|gokarna/i, src: destGoa },
  { match: /manali|ladakh|leh|spiti|himalaya|shimla|kasol|auli|srinagar|tawang|chitkul/i, src: destManali },
  { match: /rishikesh|haridwar|ganga|river/i, src: destRishikesh },
  { match: /varanasi|ghat|kolkata|bengal/i, src: destVaranasi },
  { match: /kerala|munnar|alleppey|backwater|coorg|wayanad/i, src: heroKerala },
  { match: /agra|taj|jaipur|rajasthan|jodhpur|pushkar|fort|palace/i, src: heroJaipur },
  { match: /hampi|mysore|khajuraho|orchha|ajanta|ellora|heritage|temple/i, src: heroTaj },
  { match: /darjeeling|gangtok|shillong|mountain|valley/i, src: heroLadakh },
];

export function getDestinationImage(destination: string): string {
  return DESTINATION_PHOTOS.find(({ match }) => match.test(destination))?.src ?? heroTaj;
}