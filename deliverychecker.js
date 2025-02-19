"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = exports.generateTruckSteps = exports.parcelsAreAllDeliverable = exports.parcelCanBeDelivered = exports.isTruckPath = exports.isDeliveries = exports.TupleFromParcel = exports.ParcelFromTuple = exports.isParcel = void 0;
// type guard
const isParcel = (parcel) => {
    return (parcel.pickupAddress !== undefined &&
        parcel.dropoffAddress !== undefined &&
        typeof parcel.pickupAddress === 'number' &&
        typeof parcel.dropoffAddress === 'number');
};
exports.isParcel = isParcel;
// type mapping
const ParcelFromTuple = (tuple) => {
    return { pickupAddress: tuple[0], dropoffAddress: tuple[1] };
};
exports.ParcelFromTuple = ParcelFromTuple;
const TupleFromParcel = (parcel) => {
    return [parcel.pickupAddress, parcel.dropoffAddress];
};
exports.TupleFromParcel = TupleFromParcel;
// type guard
const isDeliveries = (deliveries) => {
    return deliveries.length !== 0 && Array.isArray(deliveries) && deliveries.every(exports.isParcel);
};
exports.isDeliveries = isDeliveries;
// type guard
const isTruckPath = (truckPath) => {
    return Array.isArray(truckPath) && truckPath.every((address) => typeof address === 'number');
};
exports.isTruckPath = isTruckPath;
// This function checks if a parcel can be delivered
// It returns a tuple with either true and the steps or false and the error
// I'm using a discriminated union to make typescript able to infer the type of the return against the value of the first element of the tuple
// Its called dependent typing, it is a neat feature of typescript
const parcelCanBeDelivered = (parcel, truckPath) => {
    const pickupIndex = truckPath.indexOf(parcel.pickupAddress);
    const dropoffIndex = truckPath.indexOf(parcel.dropoffAddress);
    if (pickupIndex === -1) {
        return [
            false,
            {
                error_code: 'delivery_address_not_in_path',
                error_message: `Delivery address ${parcel.pickupAddress} not in path`,
            },
        ];
    }
    if (dropoffIndex === -1) {
        return [
            false,
            {
                error_code: 'dropoff_address_not_in_path',
                error_message: `Dropoff address ${parcel.dropoffAddress} not in path`,
            },
        ];
    }
    if (dropoffIndex < pickupIndex) {
        return [
            false,
            {
                error_code: 'delivery_dropoff_before_pickup',
                error_message: `Dropoff address ${parcel.dropoffAddress} before pickup address ${parcel.pickupAddress}`,
            },
        ];
    }
    return [
        true,
        [
            { address: parcel.pickupAddress, action: 'pickup' },
            { address: parcel.dropoffAddress, action: 'dropoff' },
        ],
    ];
};
exports.parcelCanBeDelivered = parcelCanBeDelivered;
// This function checks if all parcels can be delivered
// If one of the parcels cannot be delivered, it returns false
// I'm using a type guard to discriminate the true type of maybeSteps later
const parcelsAreAllDeliverable = (maybeSteps) => {
    return maybeSteps.every((tuple) => tuple[0] === true);
};
exports.parcelsAreAllDeliverable = parcelsAreAllDeliverable;
// This is our algo function
// It generates the steps for the driver
const generateTruckSteps = (deliveries, truckPath) => {
    // We map the deliveries to the steps
    // We dont stop at the first error, we map all the deliveries to their steps. This may be improved
    // We will have steps for addresses only if a delivery is pick up from or delivered to this address
    // This issue is addressed later in the function
    const maybeSteps = deliveries.map((parcel) => (0, exports.parcelCanBeDelivered)(parcel, truckPath));
    // If one of the parcels cannot be delivered, we return an error status
    if (!(0, exports.parcelsAreAllDeliverable)(maybeSteps)) {
        // We find the first error and return it
        // This create a difference with the exemple provided in the exercice
        // We could use an array of errors instead of a single error
        const error = maybeSteps.find((tuple) => tuple[0] === false);
        if (error) {
            return { status: 'error', ...error[1] };
        }
        return { status: 'error', error_code: 'unknown_error', error_message: 'Unknown error' };
    }
    // We extract the steps from the maybeSteps as we know that they are all true and typescript knows it too
    const onlySteps = maybeSteps.map((tuple) => tuple[1]);
    // We flatten the array of steps to go from [[Step, Step], [Step, Step], ...] to [Step, Step, Step, Step, ...]
    const flatSteps = onlySteps.flat();
    // We sort the steps by address
    const steps = flatSteps.sort((a, b) => a.address - b.address);
    // We add the missing steps. If the steps goes from 1 to 3, we add a step at 2
    // We need to do this as our algo is creating steps from the deliveries
    // If no delivery is made to an address, it will not be in the steps
    const fullSteps = steps.reduce((acc, step, i) => {
        // If we are at the last step, we add it to the accumulator
        // We dont need to check if the next step is missing
        if (i === steps.length - 1) {
            return [...acc, step];
        }
        // We check if the next stop is missing
        const nextStep = steps[i + 1];
        const isStopMissed = nextStep.address === step.address + 2;
        if (nextStep && isStopMissed) {
            return [...acc, step, { address: step.address + 1, action: null }];
        }
        return [...acc, step];
    }, []);
    // We reorder the steps to match the truck path
    const rightOrderStep = fullSteps.map((_, i) => {
        const trackId = truckPath[i];
        return fullSteps.find((step) => step.address === trackId);
    });
    return {
        status: 'success',
        steps: rightOrderStep,
    };
};
exports.generateTruckSteps = generateTruckSteps;
// This is the main function
const main = () => {
    // We get the deliveries and the truck path from the command line
    const deliveriesFromArgv = process.argv[2];
    const truckPathFromArgv = process.argv[3];
    // We check if the inputs are correct
    if (!deliveriesFromArgv || !truckPathFromArgv) {
        console.log('Usage: node deliverychecker.js <deliveries> <truckPath>');
        return 1;
    }
    // We parse the inputs
    const rawDeliveries = JSON.parse(deliveriesFromArgv);
    if (!Array.isArray(rawDeliveries) || rawDeliveries.length === 0) {
        console.log('Invalid deliveries');
        return 2;
    }
    // We map the tuples to parcels
    const deliveries = rawDeliveries.map((tuple) => (0, exports.ParcelFromTuple)(tuple));
    // We parse the truck path
    const truckPath = JSON.parse(truckPathFromArgv);
    if (!(0, exports.isDeliveries)(deliveries)) {
        console.log('Invalid deliveries');
        return 2;
    }
    if (!(0, exports.isTruckPath)(truckPath)) {
        console.log('Invalid truckPath');
        return 4;
    }
    // We run the algo
    const result = (0, exports.generateTruckSteps)(deliveries, truckPath);
    console.log(result);
    return 0;
};
exports.main = main;
(0, exports.main)();
// We are traversing the truck path and full steps a lot of times. This could be optimized if needed
// We have a complexity of O(n * m) where n is the number of deliveries and m the number of addresses in the truck path + sorting the final steps
