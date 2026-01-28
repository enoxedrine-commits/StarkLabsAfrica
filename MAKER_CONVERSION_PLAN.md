# Maker/Lab Ecommerce Conversion Plan

## 🎯 Core Product Categories (V1)

### Main Categories to Create:

1. **Microcontrollers & Brains**
   - Arduino Uno / Nano
   - ESP32 / ESP8266
   - Raspberry Pi
   - STM32

2. **Sensors & Modules**
   - Ultrasonic
   - PIR
   - IR
   - Gas sensors
   - Temp & humidity
   - RFID / NFC

3. **Power & Control**
   - Relays
   - Motor drivers
   - DC motors
   - Stepper motors
   - Servo motors
   - Buck / boost converters

4. **Prototyping Essentials**
   - Breadboards
   - Jumper wires
   - Resistors / capacitors
   - Soldering kits
   - Multimeters

5. **Starter & Project Kits** 🔥
   - Smart Home Starter Kit
   - Line-Following Robot Kit
   - Solar Power Basics Kit
   - IoT Weather Station Kit

## 🛠️ New Product Fields Needed

Add to ProductForm and Product schema:

```javascript
{
  // Existing fields...
  name, description, price, category, etc.
  
  // NEW Maker-specific fields:
  voltage: "3.3V" | "5V" | "12V" | "Variable",
  currentRating: "500mA", // max current draw
  compatibility: ["Arduino Uno", "ESP32"], // compatible boards
  requiresLevelShifter: boolean,
  usedInProjects: ["project-id-1", "project-id-2"], // project references
  alternatives: ["product-id-1"], // alternative parts if unavailable
  skillLevel: "Beginner" | "Intermediate" | "Advanced",
  projectType: "School" | "Personal" | "Startup",
  commonMistakes: ["Don't connect 5V sensor to 3.3V board"],
  wiringDiagram: "url-to-diagram",
  datasheet: "url-to-datasheet"
}
```

## 🚀 Build-First Shopping Flow

### New Component: `ProjectStarterWizard.js`

User flow:
1. Click "Start a Project" button
2. Select skill level (Beginner/Intermediate/Advanced)
3. Select project type (School/Personal/Startup)
4. Select power source (Solar/Mains/Battery)
5. System generates:
   - Required parts list
   - Optional upgrades
   - Estimated build time
   - Total cost
   - Add all to cart

## 💰 Payment Methods (East Africa)

Update checkout to include:
- MTN MoMo
- Airtel Money
- M-Pesa (Kenya)
- Pay on pickup
- Bank transfer

## 🚚 Delivery Options

Update shipping to include:
- Campus pickup points
- Innovation hubs
- Same-day city boda
- Courier upcountry

## 🤖 AI Assistant Updates

Update `app/api/agent-chat/route.js` system prompt to:
- Focus on Maker/Lab context
- Help with project planning
- Suggest compatible parts
- Explain concepts
- Guide beginners

## 🎨 Branding Updates

- Change "HelloQuip" → Maker-focused name
- Update logos and colors
- Update meta descriptions
- Update homepage copy
