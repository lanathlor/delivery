import { expect, test } from 'vitest'
import {
	generateTruckSteps,
	isDeliveries,
	isParcel,
	isTruckPath,
	main,
	parcelCanBeDelivered,
	parcelsAreAllDeliverable,
} from './deliverychecker.ts'
import { describe } from 'node:test'
import { stat } from 'fs'

describe('isParcel', () => {
	test('should return true if parcel has pickupAddress and dropoffAddress', () => {
		expect(isParcel({ pickupAddress: 1, dropoffAddress: 2 })).toBe(true)
	})
	test('should return false if parcel is missing pickupAddress', () => {
		expect(isParcel({ dropoffAddress: 2 })).toBe(false)
	})
	test('should return false if parcel is missing dropoffAddress', () => {
		expect(isParcel({ pickupAddress: 1 })).toBe(false)
	})
	test('should return false if parcel has pickupAddress as a string', () => {
		expect(isParcel({ pickupAddress: '1', dropoffAddress: 2 })).toBe(false)
	})
	test('should return false if parcel has dropoffAddress as a string', () => {
		expect(isParcel({ pickupAddress: 1, dropoffAddress: '2' })).toBe(false)
	})
})

describe('isDeliveries', () => {
	test('should return true if deliveries is an array of parcels', () => {
		expect(isDeliveries([{ pickupAddress: 1, dropoffAddress: 2 }])).toBe(true)
	})
	test('should return false if deliveries is an empty array', () => {
		expect(isDeliveries([])).toBe(false)
	})
	test('should return false if deliveries is an array of non-parcels', () => {
		expect(isDeliveries([{ pickupAddress: 1 }])).toBe(false)
	})
	test('should return false if deliveries is not an array', () => {
		expect(isDeliveries({ pickupAddress: 1 })).toBe(false)
	})
})

describe('isTruckPath', () => {
	test('should return true if truckPath is an array of numbers', () => {
		expect(isTruckPath([1, 2, 3])).toBe(true)
	})
	test('should return false if truckPath is an empty array', () => {
		expect(isTruckPath([])).toBe(true)
	})
	test('should return false if truckPath is an array of non-numbers', () => {
		expect(isTruckPath([1, '2', 3])).toBe(false)
	})
	test('should return false if truckPath is not an array', () => {
		expect(isTruckPath(1)).toBe(false)
	})
})

describe('parcelCanBeDelivered', () => {
	test('should return true if parcel can be delivered', () => {
		expect(parcelCanBeDelivered({ pickupAddress: 1, dropoffAddress: 2 }, [1, 2])).toEqual([
			true,
			[
				{ address: 1, action: 'pickup' },
				{ address: 2, action: 'dropoff' },
			],
		])
	})
	test('should return false if parcel pickup address is not in truck path', () => {
		expect(parcelCanBeDelivered({ pickupAddress: 1, dropoffAddress: 2 }, [2])).toEqual([
			false,
			{
				error_code: 'delivery_address_not_in_path',
				error_message: 'Delivery address 1 not in path',
			},
		])
	})
	test('should return false if parcel dropoff address is not in truck path', () => {
		expect(parcelCanBeDelivered({ pickupAddress: 1, dropoffAddress: 2 }, [1])).toEqual([
			false,
			{
				error_code: 'dropoff_address_not_in_path',
				error_message: 'Dropoff address 2 not in path',
			},
		])
	})
	test('should return false if parcel dropoff address is before pickup address', () => {
		expect(parcelCanBeDelivered({ pickupAddress: 1, dropoffAddress: 2 }, [2, 1])).toEqual([
			false,
			{
				error_code: 'delivery_dropoff_before_pickup',
				error_message: 'Dropoff address 2 before pickup address 1',
			},
		])
	})
})

describe('parcelsAreAllDeliverable', () => {
	test('should return true if all parcels can be delivered', () => {
		expect(
			parcelsAreAllDeliverable([
				[
					true,
					[
						{ address: 1, action: 'pickup' },
						{ address: 2, action: 'dropoff' },
					],
				],
			])
		).toBe(true)
	})
	test('should return false if some parcels cannot be delivered', () => {
		expect(
			parcelsAreAllDeliverable([
				[
					true,
					[
						{ address: 1, action: 'pickup' },
						{ address: 2, action: 'dropoff' },
					],
				],
				[
					false,
					{
						error_code: 'delivery_address_not_in_path',
						error_message: 'Delivery address 1 not in path',
					},
				],
			])
		).toBe(false)
	})
})

describe('generateTruckSteps', () => {
	test('should return an array of steps', () => {
		expect(generateTruckSteps([{ pickupAddress: 1, dropoffAddress: 2 }], [1, 2])).toEqual({
			status: 'success',
			steps: [
				{ address: 1, action: 'pickup' },
				{ address: 2, action: 'dropoff' },
			],
		})
	})
	test('should return an error if some parcels cannot be delivered because pickup is not in path', () => {
		expect(generateTruckSteps([{ pickupAddress: 1, dropoffAddress: 2 }], [2])).toEqual({
			status: 'error',
			error_code: 'delivery_address_not_in_path',
			error_message: 'Delivery address 1 not in path',
		})
	})
	test('should return an error if some parcels cannot be delivered because dropoff is not in path', () => {
		expect(generateTruckSteps([{ pickupAddress: 1, dropoffAddress: 2 }], [1])).toEqual({
			status: 'error',
			error_code: 'dropoff_address_not_in_path',
			error_message: 'Dropoff address 2 not in path',
		})
	})
	test('should return an error if some parcels cannot be delivered because dropoff is before pickup', () => {
		expect(generateTruckSteps([{ pickupAddress: 1, dropoffAddress: 2 }], [2, 1])).toEqual({
			status: 'error',
			error_code: 'delivery_dropoff_before_pickup',
			error_message: 'Dropoff address 2 before pickup address 1',
		})
	})

	test('test reversed pathing', () => {
		expect(
			generateTruckSteps(
				[
					{ pickupAddress: 3, dropoffAddress: 1 },
					{ pickupAddress: 5, dropoffAddress: 2 },
				],
				[5, 4, 3, 2, 1]
			)
		).toEqual({
			status: 'success',
			steps: [
				{ address: 5, action: 'pickup' },
				{ address: 4, action: null },
				{ address: 3, action: 'pickup' },
				{ address: 2, action: 'dropoff' },
				{ address: 1, action: 'dropoff' },
			],
		})
	})

	test('exemple 1', () => {
		expect(
			generateTruckSteps(
				[
					{ pickupAddress: 1, dropoffAddress: 3 },
					{ pickupAddress: 2, dropoffAddress: 5 },
				],
				[1, 2, 3, 4, 5]
			)
		).toEqual({
			status: 'success',
			steps: [
				{
					address: 1,
					action: 'pickup',
				},
				{
					address: 2,
					action: 'pickup',
				},
				{
					address: 3,
					action: 'dropoff',
				},
				{
					address: 4,
					action: null,
				},
				{
					address: 5,
					action: 'dropoff',
				},
			],
		})
	})
	test('exemple 2', () => {
		expect(
			generateTruckSteps(
				[
					{ pickupAddress: 1, dropoffAddress: 3 },
					{ pickupAddress: 2, dropoffAddress: 5 },
				],
				[1, 2, 4]
			)
		).toEqual({
			status: 'error',
			error_code: 'dropoff_address_not_in_path',
			error_message: 'Dropoff address 3 not in path',
		})
	})
	test('exemple 3', () => {
		expect(
			generateTruckSteps(
				[
					{ pickupAddress: 1, dropoffAddress: 3 },
					{ pickupAddress: 2, dropoffAddress: 5 },
				],
				[1, 4, 2, 3]
			)
		).toEqual({
			status: 'error',
			error_code: 'dropoff_address_not_in_path',
			error_message: 'Dropoff address 5 not in path',
		})
	})
})

describe('main', () => {
	test('should return 1 if argv is empty', () => {
		expect(main()).toBe(1)
	})

	test('should return 2 if deliveries are not valids', () => {
		process.argv = ['', '', '1', '2']
		expect(main()).toBe(2)
	})

	test('should return 4 if truckPath is not valid', () => {
		process.argv = ['', '', '[[1, 2]]', '2']
		expect(main()).toBe(4)
	})

	test('should return 0 if everything is valid', () => {
		process.argv = ['', '', '[[1, 2]]', '[1, 2]']
		expect(main()).toBe(0)
	})
})
