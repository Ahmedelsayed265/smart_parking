import dotenv from "dotenv";
import { ParkingService } from "../src/services/parkingService.js";

dotenv.config();

const layoutPayload = {
  parkingId: "2",
  layout: [
    [
      { type: "slot", spotName: "1" },
      { type: "slot", spotName: "2" },
      { type: "slot", spotName: "3" },
      { type: "slot", spotName: "4" },
      { type: "slot", spotName: "5" },
      { type: "slot", spotName: "6" },
      { type: "slot", spotName: "7" },
      { type: "slot", spotName: "8" },
      { type: "slot", spotName: "9" },
      { type: "slot", spotName: "10" },
      { type: "slot", spotName: "11" },
      { type: "slot", spotName: "12" },
      { type: "slot", spotName: "13" },
      { type: "slot", spotName: "14" },
      { type: "slot", spotName: "15" },
      { type: "alley", spotName: "alley" },
      { type: "alley", spotName: "alley" },
      { type: "alley", spotName: "alley" }
    ],
    [
      { type: "slot", spotName: "16" },
      { type: "slot", spotName: "17" },
      { type: "slot", spotName: "18" },
      { type: "slot", spotName: "19" },
      { type: "slot", spotName: "20" },
      { type: "slot", spotName: "21" },
      { type: "slot", spotName: "22" },
      { type: "slot", spotName: "23" },
      { type: "slot", spotName: "24" },
      { type: "slot", spotName: "25" },
      { type: "slot", spotName: "26" },
      { type: "slot", spotName: "27" },
      { type: "slot", spotName: "28" },
      { type: "slot", spotName: "29" },
      { type: "slot", spotName: "30" },
      { type: "slot", spotName: "31" },
      { type: "slot", spotName: "32" },
      { type: "slot", spotName: "33" }
    ],
    [
      { type: "alley", spotName: "alley" },
      { type: "alley", spotName: "alley" },
      { type: "alley", spotName: "alley" },
      { type: "alley", spotName: "alley" },
      { type: "alley", spotName: "alley" },
      { type: "alley", spotName: "alley" },
      { type: "alley", spotName: "alley" },
      { type: "alley", spotName: "alley" },
      { type: "alley", spotName: "alley" },
      { type: "alley", spotName: "alley" },
      { type: "alley", spotName: "alley" },
      { type: "alley", spotName: "alley" },
      { type: "alley", spotName: "alley" },
      { type: "alley", spotName: "alley" },
      { type: "alley", spotName: "alley" },
      { type: "alley", spotName: "alley" },
      { type: "alley", spotName: "alley" },
      { type: "alley", spotName: "alley" }
    ],
    [
      { type: "slot", spotName: "34" },
      { type: "slot", spotName: "35" },
      { type: "slot", spotName: "36" },
      { type: "slot", spotName: "37" },
      { type: "slot", spotName: "38" },
      { type: "slot", spotName: "39" },
      { type: "slot", spotName: "40" },
      { type: "slot", spotName: "41" },
      { type: "slot", spotName: "42" },
      { type: "slot", spotName: "43" },
      { type: "slot", spotName: "44" },
      { type: "slot", spotName: "45" },
      { type: "slot", spotName: "46" },
      { type: "slot", spotName: "47" },
      { type: "slot", spotName: "48" },
      { type: "slot", spotName: "49" },
      { type: "slot", spotName: "50" },
      { type: "slot", spotName: "51" }
    ],
    [
      { type: "slot", spotName: "52" },
      { type: "slot", spotName: "53" },
      { type: "slot", spotName: "54" },
      { type: "slot", spotName: "55" },
      { type: "slot", spotName: "56" },
      { type: "slot", spotName: "57" },
      { type: "slot", spotName: "58" },
      { type: "slot", spotName: "59" },
      { type: "slot", spotName: "60" },
      { type: "slot", spotName: "61" },
      { type: "slot", spotName: "62" },
      { type: "slot", spotName: "63" },
      { type: "slot", spotName: "64" },
      { type: "slot", spotName: "65" },
      { type: "slot", spotName: "66" },
      { type: "slot", spotName: "67" },
      { type: "slot", spotName: "68" },
      { type: "slot", spotName: "69" }
    ]
  ]
};

(async () => {
  const svc = new ParkingService();
  try {
    const saved = await svc.saveParkingLayout(2, layoutPayload);
    console.log("Saved layout:", saved);
    process.exit(0);
  } catch (err) {
    console.error("Failed to save layout:", err.message || err);
    process.exit(1);
  }
})();
