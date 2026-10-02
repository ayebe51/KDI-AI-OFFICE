// ==========================================================
// 3d/floors/GroundFloor.tsx
// Ground Floor Environment: Front Yard, Food Cart, Parking,
// Reception Lobby with "Koneksi Digital Inovasi" Sign, Sales Area (Naya),
// CEO Room, Engineering, Server Room, Musholla & Pantry
// ==========================================================

import React from 'react';
import { Entity } from '@playcanvas/react';
import { Render, Light } from '@playcanvas/react/components';
import { useMaterial } from '@playcanvas/react/hooks';

import { LiftEntity } from '../entities/LiftEntity.js';
import { ChibiCharacterModel } from '../character/ChibiCharacterModel.js';
import { Corridors } from '../rooms/Corridors.js';
import { ManagementRoom } from '../rooms/ManagementRoom.js';
import { PMRoom } from '../rooms/PMRoom.js';
import { ArchitectureRoom } from '../rooms/ArchitectureRoom.js';
import { EngineeringFloor } from '../rooms/EngineeringFloor.js';
import { QARoom } from '../rooms/QARoom.js';
import { SecurityRoom } from '../rooms/SecurityRoom.js';
import { ResearchRoom } from '../rooms/ResearchRoom.js';
import { MeetingRoom } from '../rooms/MeetingRoom.js';
import { PantryRoom } from '../rooms/PantryRoom.js';
import { BreakRoom } from '../rooms/BreakRoom.js';
import { MushollaRoom } from '../rooms/MushollaRoom.js';
import { ServerRoom } from '../rooms/ServerRoom.js';
import type { OfficeWorldState } from '../state/OfficeWorldStore.js';
import type { OfficeAgentDetail, ServerNode, OfficeProjectItem, OfficeRoom } from '@kdi/types';

export interface GroundFloorProps {
  worldState: OfficeWorldState;
  onCallLift?: () => void;
  onTalkNaya?: () => void;
  onTalkSinta?: () => void;
  onOpenPortfolio?: () => void;
  onOpenFoodCart?: () => void;
  onOpenCEOCommand?: () => void;
  onSelectAgent?: (agent: OfficeAgentDetail) => void;
  onSelectRoom?: (room: OfficeRoom) => void;
  onSelectServer?: (server: ServerNode) => void;
  onSelectProject?: (project: OfficeProjectItem) => void;
  onSelectWhiteboard?: () => void;
}

export const GroundFloor: React.FC<GroundFloorProps> = ({
  worldState,
  onCallLift,
  onTalkNaya,
  onTalkSinta,
  onOpenPortfolio,
  onOpenFoodCart,
  onOpenCEOCommand,
  onSelectAgent,
  onSelectRoom,
  onSelectServer,
  onSelectProject,
  onSelectWhiteboard,
}) => {
  // === Materials ===
  // Yard ground & asphalt
  const grassMat = useMaterial({ diffuse: '#8cb369', gloss: 0.1 });
  const pavementMat = useMaterial({ diffuse: '#e6ded4', gloss: 0.2 });
  const asphaltMat = useMaterial({ diffuse: '#434c5e', gloss: 0.15 });
  const lineMat = useMaterial({ diffuse: '#eceff4', gloss: 0.3 });

  // Food Cart
  const woodCartMat = useMaterial({ diffuse: '#8a5a3c', gloss: 0.3 });
  const awningCreamMat = useMaterial({ diffuse: '#fffaf0', gloss: 0.2 });
  const awningOrangeMat = useMaterial({ diffuse: '#e8765d', gloss: 0.2 });
  const metalPropMat = useMaterial({ diffuse: '#d8dee9', metalness: 0.6, gloss: 0.7 });
  const lanternGlowMat = useMaterial({
    diffuse: '#ffd166',
    emissive: '#f59e0b',
    emissiveIntensity: 0.9,
    gloss: 0.9,
  });

  // Vehicles
  const carBodyMat = useMaterial({ diffuse: '#3f8fd6', gloss: 0.6, metalness: 0.2 });
  const scooterBodyMat = useMaterial({ diffuse: '#e26d9c', gloss: 0.6 });
  const wheelMat = useMaterial({ diffuse: '#2e3440', gloss: 0.2 });
  const glassMat = useMaterial({
    diffuse: '#a8dadc',
    opacity: 0.5,
    blendType: 2,
    gloss: 0.8,
  });

  // Lobby Floor & Furniture
  const lobbyFloorMat = useMaterial({ diffuse: '#fffaf0', gloss: 0.4 });
  const receptionDeskMat = useMaterial({ diffuse: '#9c8069', gloss: 0.4 });
  const sofaPastelMat = useMaterial({ diffuse: '#90b4ce', gloss: 0.2 });
  const plantPotMat = useMaterial({ diffuse: '#d4a373', gloss: 0.3 });
  const plantLeafMat = useMaterial({ diffuse: '#2a9d8f', gloss: 0.3 });

  // Main Office Signage: "Koneksi Digital Inovasi"
  const signBackingMat = useMaterial({ diffuse: '#2b2f3a', gloss: 0.4 });
  const neonSignMat = useMaterial({
    diffuse: '#00f5d4',
    emissive: '#00f5d4',
    emissiveIntensity: 1.2,
    gloss: 0.9,
  });
  const goldSignMat = useMaterial({
    diffuse: '#ffbe0b',
    emissive: '#d97706',
    emissiveIntensity: 0.8,
    gloss: 0.9,
  });

  // Sales Area
  const salesFloorMat = useMaterial({ diffuse: '#fdfbf7', gloss: 0.3 });
  const deskMat = useMaterial({ diffuse: '#b08968', gloss: 0.3 });
  const chairMat = useMaterial({ diffuse: '#e8765d', gloss: 0.25 });
  const laptopMat = useMaterial({ diffuse: '#3a3f4b', metalness: 0.5, gloss: 0.6 });
  const screenMat = useMaterial({
    diffuse: '#38bdf8',
    emissive: '#0284c7',
    emissiveIntensity: 0.6,
  });

  // CEO Room
  const ceoDeskMat = useMaterial({ diffuse: '#5c3d2e', gloss: 0.5 });
  const ceoLeatherMat = useMaterial({ diffuse: '#3a2417', gloss: 0.6 });
  const shelfWoodMat = useMaterial({ diffuse: '#6b4f3a', gloss: 0.3 });
  const awardGoldMat = useMaterial({
    diffuse: '#ffb703',
    emissive: '#fb8500',
    emissiveIntensity: 0.5,
    metalness: 0.7,
  });

  const agentsList = Array.from(worldState.agents.values());
  const activeMeeting = worldState.meetings.find((m) => m.status === 'ACTIVE') || null;

  return (
    <Entity name="GroundFloorRoot">
      {/* ────────────────────────────────────────────────────────── */}
      {/* 1. FRONT YARD & EXTERIOR (z: 22 to 34)                     */}
      {/* ────────────────────────────────────────────────────────── */}
      <Entity name="FrontYardArea" position={[0, 0, 27]}>
        {/* Grass Lawn Base */}
        <Entity name="FrontLawn" position={[0, 0.005, 0]} scale={[26, 0.01, 14]}>
          <Render type="box" material={grassMat} receiveShadows={true} />
        </Entity>

        {/* Central Stone Walkway to Entrance */}
        <Entity name="EntranceWalkway" position={[0, 0.015, -1]} scale={[4.5, 0.015, 12]}>
          <Render type="box" material={pavementMat} receiveShadows={true} />
        </Entity>

        {/* ── PARKING LOT (Right side, x: 7, z: 1) ── */}
        <Entity name="ParkingLot" position={[7.5, 0.01, 0]}>
          {/* Asphalt Bed */}
          <Entity name="AsphaltBed" position={[0, 0, 0]} scale={[10, 0.012, 10]}>
            <Render type="box" material={asphaltMat} receiveShadows={true} />
          </Entity>
          {/* White parking bays */}
          <Entity name="ParkLine1" position={[-3.2, 0.02, 0]} scale={[0.15, 0.01, 8.5]}>
            <Render type="box" material={lineMat} />
          </Entity>
          <Entity name="ParkLine2" position={[0, 0.02, 0]} scale={[0.15, 0.01, 8.5]}>
            <Render type="box" material={lineMat} />
          </Entity>
          <Entity name="ParkLine3" position={[3.2, 0.02, 0]} scale={[0.15, 0.01, 8.5]}>
            <Render type="box" material={lineMat} />
          </Entity>

          {/* Low-Poly Cute Pastel Car in Bay 1 */}
          <Entity name="CuteCar" position={[-1.6, 0, 0]} rotation={[0, 0, 0]}>
            {/* Body */}
            <Entity name="CarChassis" position={[0, 0.45, 0]} scale={[1.8, 0.55, 3.2]}>
              <Render type="box" material={carBodyMat} castShadows={true} />
            </Entity>
            {/* Cabin */}
            <Entity name="CarCabin" position={[0, 0.95, -0.2]} scale={[1.5, 0.55, 1.8]}>
              <Render type="box" material={glassMat} />
            </Entity>
            {/* Wheels */}
            <Entity name="WheelFL" position={[-0.95, 0.25, 1.0]} scale={[0.2, 0.5, 0.5]}>
              <Render type="cylinder" material={wheelMat} />
            </Entity>
            <Entity name="WheelFR" position={[0.95, 0.25, 1.0]} scale={[0.2, 0.5, 0.5]}>
              <Render type="cylinder" material={wheelMat} />
            </Entity>
            <Entity name="WheelRL" position={[-0.95, 0.25, -1.0]} scale={[0.2, 0.5, 0.5]}>
              <Render type="cylinder" material={wheelMat} />
            </Entity>
            <Entity name="WheelRR" position={[0.95, 0.25, -1.0]} scale={[0.2, 0.5, 0.5]}>
              <Render type="cylinder" material={wheelMat} />
            </Entity>
          </Entity>

          {/* Low-Poly Cute Scooter in Bay 2 */}
          <Entity name="CuteScooter" position={[1.8, 0, 0.5]} rotation={[0, -20, 0]}>
            <Entity name="ScooterBody" position={[0, 0.4, 0]} scale={[0.45, 0.4, 1.4]}>
              <Render type="box" material={scooterBodyMat} castShadows={true} />
            </Entity>
            <Entity name="ScooterWheelF" position={[0, 0.2, 0.6]} scale={[0.1, 0.4, 0.4]}>
              <Render type="cylinder" material={wheelMat} />
            </Entity>
            <Entity name="ScooterWheelR" position={[0, 0.2, -0.6]} scale={[0.1, 0.4, 0.4]}>
              <Render type="cylinder" material={wheelMat} />
            </Entity>
          </Entity>
        </Entity>

        {/* ── FOOD CART: "Kopi Corner Pak Joko" (Left side, x: -7, z: 0) ── */}
        <Entity
          name="FoodCartLandmark"
          position={[-7.0, 0, 0]}
          onClick={onOpenFoodCart}
          onPointerDown={onOpenFoodCart}
        >
          {/* Wooden Counter Cart Base */}
          <Entity name="CartBase" position={[0, 0.55, 0]} scale={[2.6, 0.85, 1.6]}>
            <Render type="box" material={woodCartMat} castShadows={true} />
          </Entity>
          {/* Wheels of cart */}
          <Entity name="CartWheelL" position={[-1.1, 0.3, 0]} scale={[0.12, 0.6, 0.6]}>
            <Render type="cylinder" material={wheelMat} />
          </Entity>
          <Entity name="CartWheelR" position={[1.1, 0.3, 0]} scale={[0.12, 0.6, 0.6]}>
            <Render type="cylinder" material={wheelMat} />
          </Entity>

          {/* Wooden Counter Top */}
          <Entity name="CartCounter" position={[0, 0.98, 0]} scale={[2.9, 0.08, 1.8]}>
            <Render type="box" material={woodCartMat} />
          </Entity>

          {/* Striped Awning Pillars */}
          <Entity name="PoleFL" position={[-1.3, 1.7, 0.8]} scale={[0.08, 1.5, 0.08]}>
            <Render type="cylinder" material={woodCartMat} />
          </Entity>
          <Entity name="PoleFR" position={[1.3, 1.7, 0.8]} scale={[0.08, 1.5, 0.08]}>
            <Render type="cylinder" material={woodCartMat} />
          </Entity>
          <Entity name="PoleBL" position={[-1.3, 1.7, -0.8]} scale={[0.08, 1.5, 0.08]}>
            <Render type="cylinder" material={woodCartMat} />
          </Entity>
          <Entity name="PoleBR" position={[1.3, 1.7, -0.8]} scale={[0.08, 1.5, 0.08]}>
            <Render type="cylinder" material={woodCartMat} />
          </Entity>

          {/* Striped Awning Roof (alternating cream and terracotta stripes) */}
          <Entity name="AwningCream" position={[0, 2.45, 0]} scale={[2.9, 0.25, 1.9]}>
            <Render type="box" material={awningCreamMat} castShadows={true} />
          </Entity>
          <Entity name="AwningStripe1" position={[-0.8, 2.47, 0]} scale={[0.45, 0.27, 1.92]}>
            <Render type="box" material={awningOrangeMat} />
          </Entity>
          <Entity name="AwningStripe2" position={[0.8, 2.47, 0]} scale={[0.45, 0.27, 1.92]}>
            <Render type="box" material={awningOrangeMat} />
          </Entity>

          {/* Coffee props on counter: kettle, cups, jars */}
          <Entity name="CoffeeKettle" position={[-0.6, 1.15, 0.2]} scale={[0.28, 0.32, 0.28]}>
            <Render type="cylinder" material={metalPropMat} />
          </Entity>
          <Entity name="Cup1" position={[0.2, 1.08, 0.3]} scale={[0.12, 0.16, 0.12]}>
            <Render type="cylinder" material={awningCreamMat} />
          </Entity>
          <Entity name="Cup2" position={[0.45, 1.08, 0.3]} scale={[0.12, 0.16, 0.12]}>
            <Render type="cylinder" material={awningCreamMat} />
          </Entity>

          {/* Warm glowing lantern */}
          <Entity name="WarmLantern" position={[1.0, 2.0, 0.7]} scale={[0.18, 0.25, 0.18]}>
            <Render type="box" material={lanternGlowMat} />
            <Light type="omni" color="#ffd166" intensity={1.2} range={6} />
          </Entity>

          {/* NPC Pak Joko standing by food cart */}
          <ChibiCharacterModel
            name="Pak Joko"
            roleBadge="Kopi KDI & Camilan"
            appearance={{
              headColor: '#f9d2be',
              hairColor: '#171717',
              torsoColor: '#92400e',
              pantsColor: '#1c1917',
              shoesColor: '#1c1917',
              accentColor: '#d97706',
            }}
            x={1.8}
            y={0}
            z={0.2}
            rotY={-70}
            animation="idle"
          />
        </Entity>

        {/* Low-Poly Pastel Trees along walkway */}
        <Entity name="PastelTree1" position={[-3.2, 0, 4]}>
          <Entity name="Trunk" position={[0, 0.7, 0]} scale={[0.24, 1.4, 0.24]}>
            <Render type="cylinder" material={woodCartMat} castShadows={true} />
          </Entity>
          <Entity name="Leaves1" position={[0, 1.8, 0]} scale={[1.4, 1.2, 1.4]}>
            <Render type="sphere" material={grassMat} castShadows={true} />
          </Entity>
        </Entity>
        <Entity name="PastelTree2" position={[3.2, 0, 4]}>
          <Entity name="Trunk" position={[0, 0.7, 0]} scale={[0.24, 1.4, 0.24]}>
            <Render type="cylinder" material={woodCartMat} castShadows={true} />
          </Entity>
          <Entity name="Leaves2" position={[0, 1.8, 0]} scale={[1.4, 1.2, 1.4]}>
            <Render type="sphere" material={grassMat} castShadows={true} />
          </Entity>
        </Entity>

        {/* Glass Entrance Canopy */}
        <Entity name="EntranceCanopy" position={[0, 3.2, 20.8]} scale={[5.5, 0.15, 2.2]}>
          <Render type="box" material={glassMat} />
        </Entity>
      </Entity>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 2. RECEPTION LOBBY & MAIN SIGN (z: 16)                     */}
      {/* ────────────────────────────────────────────────────────── */}
      <Entity name="ReceptionLobbyArea" position={[0, 0, 16]}>
        {/* Lobby Polished Marble Floor */}
        <Entity name="LobbyFloor" position={[0, 0.015, 0]} scale={[15.6, 0.02, 9.6]}>
          <Render type="box" material={lobbyFloorMat} receiveShadows={true} />
        </Entity>

        {/* ── MAIN OFFICE SIGNAGE: "Koneksi Digital Inovasi" ── */}
        <Entity name="KDISignageWall" position={[0, 2.8, -4.5]}>
          {/* Backing plate */}
          <Entity name="SignBacking" position={[0, 0, 0]} scale={[9.2, 1.8, 0.12]}>
            <Render type="box" material={signBackingMat} />
          </Entity>
          {/* Illuminated Soft Neon Bar — "Koneksi Digital Inovasi" */}
          <Entity name="NeonSignBar" position={[0, 0.35, 0.08]} scale={[7.8, 0.45, 0.06]}>
            <Render type="box" material={neonSignMat} />
            <Light type="omni" color="#00f5d4" intensity={1.5} range={8} />
          </Entity>
          {/* Subtitle Accent Bar: AI Software Office & Digital Headquarters */}
          <Entity name="SignSubtextBar" position={[0, -0.3, 0.08]} scale={[5.2, 0.2, 0.04]}>
            <Render type="box" material={goldSignMat} />
          </Entity>
        </Entity>

        {/* Reception Counter */}
        <Entity name="ReceptionDesk" position={[0, 0.55, 0]} scale={[4.0, 1.1, 1.3]}>
          <Render type="box" material={receptionDeskMat} castShadows={true} />
        </Entity>

        {/* Receptionist NPC: Citra */}
        <ChibiCharacterModel
          name="Citra"
          roleBadge="Resepsionis KDI"
          appearance={{
            headColor: '#f9d2be',
            hairColor: '#262626',
            torsoColor: '#0ea5e9',
            pantsColor: '#1e293b',
            shoesColor: '#1c1917',
            accentColor: '#38bdf8',
          }}
          x={0}
          y={0}
          z={-0.8}
          rotY={0}
          animation="idle"
        />

        {/* Waiting Lounge Sofa & Coffee Table */}
        <Entity name="LobbySofa" position={[-4.5, 0.4, 0]} scale={[1.4, 0.8, 3.2]}>
          <Render type="box" material={sofaPastelMat} castShadows={true} />
        </Entity>
        <Entity name="LobbyCoffeeTable" position={[-2.8, 0.25, 0]} scale={[1.2, 0.45, 1.8]}>
          <Render type="box" material={receptionDeskMat} />
        </Entity>

        {/* Potted Monstera Plants */}
        <Entity name="MonsteraPlanter" position={[-5.8, 0, -2.8]}>
          <Entity name="Pot" position={[0, 0.4, 0]} scale={[0.7, 0.8, 0.7]}>
            <Render type="cylinder" material={plantPotMat} />
          </Entity>
          <Entity name="Foliage" position={[0, 1.1, 0]} scale={[1.1, 0.9, 1.1]}>
            <Render type="sphere" material={plantLeafMat} castShadows={true} />
          </Entity>
        </Entity>

        {/* ── Interactive Portfolio Display Kiosk (x: -3.5, z: 2) ── */}
        <Entity
          name="PortfolioKioskDisplay"
          position={[-3.5, 0, 2]}
          onClick={onOpenPortfolio}
          onPointerDown={onOpenPortfolio}
        >
          <Entity name="KioskStand" position={[0, 0.6, 0]} scale={[0.5, 1.2, 0.5]}>
            <Render type="box" material={receptionDeskMat} castShadows={true} />
          </Entity>
          <Entity name="KioskScreen" position={[0, 1.35, 0.05]} rotation={[-15, 0, 0]} scale={[0.95, 0.65, 0.06]}>
            <Render type="box" material={screenMat} />
            <Light type="omni" color="#38bdf8" intensity={0.8} range={4} />
          </Entity>
        </Entity>

        {/* ── Interactive Elevator Lift (x: 7.5, z: 0) ── */}
        <LiftEntity
          position={[7.5, 0, 0]}
          rotation={[0, -90, 0]}
          currentFloorLabel="1"
          onCallLift={onCallLift}
        />
      </Entity>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 3. SALES AREA with NAYA (ACCOUNT MANAGER) (x: 7, z: 8)      */}
      {/* ────────────────────────────────────────────────────────── */}
      <Entity name="SalesAreaRoot" position={[7.0, 0, 8]}>
        {/* Sales Floor Zone */}
        <Entity name="SalesFloor" position={[0, 0.015, 0]} scale={[8.6, 0.02, 7.6]}>
          <Render type="box" material={salesFloorMat} receiveShadows={true} />
        </Entity>

        {/* 3 Ergonomic Sales Desks, Chairs & Computers */}
        {/* Desk 1: Naya's Station */}
        <Entity name="NayaSalesDesk" position={[-0.5, 0, 0]}>
          <Entity name="DeskBase" position={[0, 0.4, 0]} scale={[1.8, 0.75, 0.9]}>
            <Render type="box" material={deskMat} castShadows={true} />
          </Entity>
          <Entity name="Laptop" position={[0, 0.8, 0]} scale={[0.5, 0.04, 0.35]}>
            <Render type="box" material={laptopMat} />
          </Entity>
          <Entity name="LaptopScreen" position={[0, 1.0, -0.15]} rotation={[15, 0, 0]} scale={[0.48, 0.34, 0.03]}>
            <Render type="box" material={screenMat} />
          </Entity>
          <Entity name="Chair" position={[0, 0.35, -0.7]} scale={[0.6, 0.7, 0.6]}>
            <Render type="box" material={chairMat} castShadows={true} />
          </Entity>
        </Entity>

        {/* Desk 2: Sales Consultant Budi */}
        <Entity name="SalesDesk2" position={[-2.8, 0, 0]}>
          <Entity name="DeskBase" position={[0, 0.4, 0]} scale={[1.6, 0.75, 0.85]}>
            <Render type="box" material={deskMat} castShadows={true} />
          </Entity>
          <Entity name="Laptop" position={[0, 0.8, 0]} scale={[0.45, 0.04, 0.3]}>
            <Render type="box" material={laptopMat} />
          </Entity>
          <Entity name="Chair" position={[0, 0.35, -0.7]} scale={[0.55, 0.7, 0.55]}>
            <Render type="box" material={chairMat} />
          </Entity>
        </Entity>

        {/* Desk 3: Client Solutions Specialist Dewi */}
        <Entity name="SalesDesk3" position={[2.2, 0, 0]}>
          <Entity name="DeskBase" position={[0, 0.4, 0]} scale={[1.6, 0.75, 0.85]}>
            <Render type="box" material={deskMat} castShadows={true} />
          </Entity>
          <Entity name="Laptop" position={[0, 0.8, 0]} scale={[0.45, 0.04, 0.3]}>
            <Render type="box" material={laptopMat} />
          </Entity>
          <Entity name="Chair" position={[0, 0.35, -0.7]} scale={[0.55, 0.7, 0.55]}>
            <Render type="box" material={chairMat} />
          </Entity>
        </Entity>

        {/* Sales Performance Whiteboard */}
        <Entity name="SalesWhiteboard" position={[0, 1.4, -3.2]} scale={[3.4, 1.6, 0.08]}>
          <Render type="box" material={lobbyFloorMat} />
        </Entity>

        {/* ── NAYA NPC (Account Manager) Standing / Greeting at her desk ── */}
        <Entity
          name="NayaNPCInteractable"
          onClick={onTalkNaya || onTalkSinta}
          onPointerDown={onTalkNaya || onTalkSinta}
        >
          <ChibiCharacterModel
            name="Naya"
            roleBadge="Account Manager"
            appearance={{
              headColor: '#f9d2be',
              hairColor: '#2b1b17',
              torsoColor: '#f59e0b', // warm amber blazer
              pantsColor: '#1f2937',
              shoesColor: '#1f2937',
              accentColor: '#fbbf24',
            }}
            x={-0.5}
            y={0}
            z={0.9}
            rotY={180}
            animation="idle"
          />
        </Entity>
      </Entity>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 4. CEO EXECUTIVE ROOM (x: -12, z: 16)                      */}
      {/* ────────────────────────────────────────────────────────── */}
      <Entity
        name="CEORoomArea"
        position={[-12, 0, 16]}
        onClick={onOpenCEOCommand}
        onPointerDown={onOpenCEOCommand}
      >
        {/* Walnut Executive Desk */}
        <Entity name="CEODesk" position={[0, 0.45, 0]} scale={[2.6, 0.85, 1.3]}>
          <Render type="box" material={ceoDeskMat} castShadows={true} />
        </Entity>

        {/* Dual Curved CEO Displays */}
        <Entity name="CEODisplayLeft" position={[-0.45, 1.05, 0]} rotation={[0, 15, 0]} scale={[0.65, 0.42, 0.04]}>
          <Render type="box" material={screenMat} />
        </Entity>
        <Entity name="CEODisplayRight" position={[0.45, 1.05, 0]} rotation={[0, -15, 0]} scale={[0.65, 0.42, 0.04]}>
          <Render type="box" material={screenMat} />
        </Entity>

        {/* High-back CEO Leather Chair */}
        <Entity name="CEOChair" position={[0, 0.55, -0.8]} scale={[0.85, 1.1, 0.8]}>
          <Render type="box" material={ceoLeatherMat} castShadows={true} />
        </Entity>

        {/* Executive Bookshelf & Awards */}
        <Entity name="CEOBookshelf" position={[0, 1.4, -3.2]} scale={[3.2, 2.6, 0.5]}>
          <Render type="box" material={shelfWoodMat} />
        </Entity>
        <Entity name="AwardTrophy" position={[-0.6, 2.1, -3.0]} scale={[0.2, 0.4, 0.2]}>
          <Render type="cylinder" material={awardGoldMat} />
        </Entity>

        {/* VIP Discussion Corner */}
        <Entity name="VIPCornerSofa" position={[2.8, 0.35, 1.2]} scale={[1.8, 0.7, 1.2]}>
          <Render type="box" material={ceoLeatherMat} />
        </Entity>
      </Entity>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 5. PRESERVED MODULAR ROOMS & INFRASTRUCTURE                */}
      {/* ────────────────────────────────────────────────────────── */}
      <Corridors />

      <ManagementRoom onSelectRoom={() => onSelectRoom?.(worldState.rooms.get('RM-MANAGEMENT')!)} />
      <PMRoom onSelectRoom={() => onSelectRoom?.(worldState.rooms.get('RM-PM')!)} />
      <ArchitectureRoom onSelectRoom={() => onSelectRoom?.(worldState.rooms.get('RM-ARCHITECTURE')!)} />
      <EngineeringFloor agents={agentsList} onSelectRoom={() => onSelectRoom?.(worldState.rooms.get('RM-ENGINEERING')!)} />
      <QARoom onSelectRoom={() => onSelectRoom?.(worldState.rooms.get('RM-QA')!)} />
      <SecurityRoom onSelectRoom={() => onSelectRoom?.(worldState.rooms.get('RM-SECURITY')!)} />
      <ResearchRoom onSelectRoom={() => onSelectRoom?.(worldState.rooms.get('RM-RESEARCH')!)} />
      <MeetingRoom activeMeeting={activeMeeting} onSelectWhiteboard={onSelectWhiteboard} onSelectRoom={() => onSelectRoom?.(worldState.rooms.get('RM-MEETING')!)} />
      <PantryRoom onSelectRoom={() => onSelectRoom?.(worldState.rooms.get('RM-PANTRY')!)} />
      <BreakRoom onSelectRoom={() => onSelectRoom?.(worldState.rooms.get('RM-BREAK')!)} />
      <MushollaRoom activePrayer={worldState.activePrayer} onSelectRoom={() => onSelectRoom?.(worldState.rooms.get('RM-MUSHOLLA')!)} />
      <ServerRoom serverNodes={worldState.serverNodes} onSelectServer={onSelectServer} onSelectRoom={() => onSelectRoom?.(worldState.rooms.get('RM-SERVER')!)} />
    </Entity>
  );
};
