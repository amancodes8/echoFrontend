import mockApi from '../api/mockApi';


export async function fetchHistory(userId) {
return mockApi.getHistory(userId);
}


export function getLiveSignals(userId) {
return mockApi.getLiveSignals(userId);
}


// convenience: subscribe to simulated server pushes
export function simulatePush(userId, signal) {
mockApi.pushLiveSignal(userId, signal);
}