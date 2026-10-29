/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LayoutObject, VenueDetails } from '../types';

export interface CapacityEvaluation {
  isCompliant: boolean;
  totalSeatsConfigured: number;
  indoorSeatsConfigured: number;
  outdoorSeatsConfigured: number;
  expectedAttendance: number;
  deficit: number;
  indoorMaxCapacity: number;
  outdoorMaxCapacity: number;
  indoorOccupancyRate: number;
  outdoorOccupancyRate: number;
  warnings: string[];
  recommendations: string[];
}

/**
 * Deterministically evaluates venue capacity against layout furniture configuration and expected attendance.
 */
export function evaluateVenueCapacity(
  venue: VenueDetails,
  layoutObjects: LayoutObject[],
  expectedAttendance: number
): CapacityEvaluation {
  let indoorSeatsConfigured = 0;
  let outdoorSeatsConfigured = 0;

  for (const obj of layoutObjects) {
    if (obj.status === 'flooded' || obj.status === 'damaged') continue;
    if (obj.zone === 'indoor') {
      indoorSeatsConfigured += obj.capacity || 0;
    } else {
      outdoorSeatsConfigured += obj.capacity || 0;
    }
  }

  const totalSeatsConfigured = indoorSeatsConfigured + outdoorSeatsConfigured;
  const deficit = Math.max(0, expectedAttendance - totalSeatsConfigured);
  const warnings: string[] = [];
  const recommendations: string[] = [];

  const indoorMaxCapacity = venue.totalIndoorCapacity || 400;
  const outdoorMaxCapacity = venue.totalOutdoorCapacity || 600;

  const indoorOccupancyRate =
    indoorMaxCapacity > 0 ? Math.round((indoorSeatsConfigured / indoorMaxCapacity) * 100) : 0;
  const outdoorOccupancyRate =
    outdoorMaxCapacity > 0 ? Math.round((outdoorSeatsConfigured / outdoorMaxCapacity) * 100) : 0;

  if (indoorSeatsConfigured > indoorMaxCapacity) {
    warnings.push(
      `Indoor seating (${indoorSeatsConfigured}) exceeds authorized indoor capacity (${indoorMaxCapacity}). Violates safety limits.`
    );
  }

  if (outdoorSeatsConfigured > outdoorMaxCapacity) {
    warnings.push(
      `Outdoor seating (${outdoorSeatsConfigured}) exceeds authorized lawn capacity (${outdoorMaxCapacity}).`
    );
  }

  if (deficit > 0) {
    warnings.push(
      `Seating shortage: ${deficit} guests do not have allocated seating based on current layout.`
    );
    recommendations.push(
      `Add ${Math.ceil(deficit / 8)} round banquet tables (8 pax each) or additional row seating.`
    );
  }

  const isCompliant = deficit === 0 && indoorSeatsConfigured <= indoorMaxCapacity;

  return {
    isCompliant,
    totalSeatsConfigured,
    indoorSeatsConfigured,
    outdoorSeatsConfigured,
    expectedAttendance,
    deficit,
    indoorMaxCapacity,
    outdoorMaxCapacity,
    indoorOccupancyRate,
    outdoorOccupancyRate,
    warnings,
    recommendations,
  };
}

/**
 * Validates that an object is positioned strictly within the physical boundaries of the venue zone.
 */
export function isObjectWithinBounds(
  position: [number, number, number],
  zone: 'indoor' | 'outdoor',
  venue: VenueDetails
): boolean {
  const [x, , z] = position;
  const halfWidth = (zone === 'indoor' ? venue.indoorWidth : venue.outdoorWidth) / 2;
  const halfLength = (zone === 'indoor' ? venue.indoorLength : venue.outdoorLength) / 2;

  // Margin of 1m inside walls
  return (
    x >= -halfWidth + 0.5 &&
    x <= halfWidth - 0.5 &&
    z >= -halfLength + 0.5 &&
    z <= halfLength - 0.5
  );
}
