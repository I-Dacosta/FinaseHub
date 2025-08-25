// Test Norwegian decimal parsing
const testValue = "10,2571";
console.log("Original value:", testValue);
console.log("parseFloat result:", parseFloat(testValue));
console.log("Corrected result:", parseFloat(testValue.replace(',', '.')));

// Test with the actual API response format
const csvLine = "B;Virkedag;USD;Amerikanske dollar;NOK;Norske kroner;SP;Spot;4;false;0;Enheter;C;ECB concertation tidspunkt 14:15 CET;2025-08-20;10,2571";
const parts = csvLine.split(';');
const obsValue = parts[parts.length - 1];
console.log("CSV OBS_VALUE:", obsValue);
console.log("parseFloat result:", parseFloat(obsValue));
console.log("Corrected result:", parseFloat(obsValue.replace(',', '.')));
