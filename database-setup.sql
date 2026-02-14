-- Smart Parking Backend Database Setup

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  password VARCHAR(255) NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Parking lots table
CREATE TABLE IF NOT EXISTS parking_lots (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Parking slots table
CREATE TABLE IF NOT EXISTS parking_slots (
  id SERIAL PRIMARY KEY,
  parking_lot_id INTEGER REFERENCES parking_lots(id) ON DELETE CASCADE,
  label VARCHAR(50) NOT NULL,
  x1 FLOAT NOT NULL,
  y1 FLOAT NOT NULL,
  x2 FLOAT NOT NULL,
  y2 FLOAT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(parking_lot_id, label)
);

-- Detection logs table
CREATE TABLE IF NOT EXISTS detection_logs (
  id SERIAL PRIMARY KEY,
  parking_lot_id INTEGER REFERENCES parking_lots(id) ON DELETE CASCADE,
  occupied_slots TEXT[],
  total_occupied INTEGER,
  image_path VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Parking detection results table (stores parking_id and ONNX model output)
CREATE TABLE IF NOT EXISTS parking_detection_results (
  id SERIAL PRIMARY KEY,
  parking_id INTEGER NOT NULL,
  occupied_slots TEXT[],
  available_slots TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Parking layouts table (stores parking_id and layout structure)
CREATE TABLE IF NOT EXISTS parking_layouts (
  id SERIAL PRIMARY KEY,
  parking_id INTEGER NOT NULL,
  layout JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email verification codes
CREATE TABLE IF NOT EXISTS email_verifications (
  code VARCHAR(6) PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Password reset codes
CREATE TABLE IF NOT EXISTS password_resets (
  email VARCHAR(255) PRIMARY KEY,
  code VARCHAR(6) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Token blacklist for logout
CREATE TABLE IF NOT EXISTS token_blacklist (
  id SERIAL PRIMARY KEY,
  token TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Favourite parkings table
CREATE TABLE IF NOT EXISTS favourite_parkings (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  parking_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(username, parking_id)
);

-- Parking history table
CREATE TABLE IF NOT EXISTS parking_history (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  parking_id INTEGER NOT NULL,
  last_visited TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(username, parking_id)
);

-- Insert default parking lot
INSERT INTO parking_lots (id, name, description) 
VALUES (1, 'Main Parking Lot', 'Default parking lot for the smart garage system')
ON CONFLICT (id) DO NOTHING;

-- Insert parking slots
INSERT INTO parking_slots (parking_lot_id, label, x1, y1, x2, y2) VALUES
(1, '1', 1088.0, 432.0, 1151.0, 487.0),
(1, '2', 1039.0, 433.0, 1102.0, 483.0),
(1, '3', 992.0, 432.0, 1054.0, 485.0),
(1, '4', 946.0, 430.0, 1003.0, 483.0),
(1, '5', 898.0, 430.0, 954.0, 482.0),
(1, '6', 856.0, 430.0, 908.0, 482.0),
(1, '7', 807.0, 429.0, 861.0, 480.0),
(1, '8', 764.0, 428.0, 811.0, 479.0),
(1, '9', 718.0, 427.0, 766.0, 478.0),
(1, '10', 672.0, 426.0, 719.0, 477.0),
(1, '11', 624.0, 424.0, 676.0, 476.0),
(1, '12', 581.0, 423.0, 633.0, 476.0),
(1, '13', 536.0, 425.0, 593.0, 477.0),
(1, '14', 494.0, 427.0, 548.0, 475.0),
(1, '15', 450.0, 420.0, 505.0, 476.0),
(1, '16', 407.0, 425.0, 458.0, 475.0),
(1, '17', 364.0, 424.0, 416.0, 476.0),
(1, '18', 295.0, 425.0, 352.0, 474.0),
(1, '19', 253.0, 425.0, 310.0, 474.0),
(1, '20', 208.0, 423.0, 274.0, 471.0),
(1, '21', 170.0, 423.0, 228.0, 471.0),
(1, '22', 131.0, 421.0, 187.0, 473.0),
(1, '23', 92.0, 419.0, 154.0, 471.0),
(1, '24', 56.0, 418.0, 107.0, 468.0),
(1, '25', 17.0, 422.0, 79.0, 464.0)
ON CONFLICT (parking_lot_id, label) DO UPDATE SET
  x1 = EXCLUDED.x1,
  y1 = EXCLUDED.y1,
  x2 = EXCLUDED.x2,
  y2 = EXCLUDED.y2;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_parking_slots_lot_id ON parking_slots(parking_lot_id);
CREATE INDEX IF NOT EXISTS idx_parking_slots_label ON parking_slots(label);
CREATE INDEX IF NOT EXISTS idx_detection_logs_lot_id ON detection_logs(parking_lot_id);
CREATE INDEX IF NOT EXISTS idx_detection_logs_created_at ON detection_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_parking_detection_results_parking_id ON parking_detection_results(parking_id);
CREATE INDEX IF NOT EXISTS idx_parking_detection_results_created_at ON parking_detection_results(created_at);
CREATE INDEX IF NOT EXISTS idx_parking_layouts_parking_id ON parking_layouts(parking_id);
CREATE INDEX IF NOT EXISTS idx_parking_layouts_created_at ON parking_layouts(created_at);
CREATE INDEX IF NOT EXISTS idx_favourite_parkings_username ON favourite_parkings(username);
CREATE INDEX IF NOT EXISTS idx_favourite_parkings_parking_id ON favourite_parkings(parking_id);
CREATE INDEX IF NOT EXISTS idx_parking_history_username ON parking_history(username);
CREATE INDEX IF NOT EXISTS idx_parking_history_parking_id ON parking_history(parking_id);
CREATE INDEX IF NOT EXISTS idx_parking_history_last_visited ON parking_history(last_visited);