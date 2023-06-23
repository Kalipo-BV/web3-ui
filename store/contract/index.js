/* Kalipo B.V. - the DAO platform for business & societal impact 
 * Copyright (C) 2022 Peter Nobels and Matthias van Dijk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { isArray, isObject, isBoolean, isDate, isNumber, isId, isString, isValidPartyData, isNotNull } from "./validation.js"
import { getAllFromLocalStorage, saveNewToLocalStorage, saveToLocalStorage, getFromLocalStorage, normalizeContract } from "./localstorage.js"
import { initFormData, initContract } from "./initData.js";

function initState () {
	return {
		body: initContract(),
		id: -1,
		loadError: false,
		allContracts: getAllFromLocalStorage,// is used as prop because getters are cached based on props
	}
}

function genericErrorChecking(payload, state, type='string') {
	if (payload.key === undefined) {
		console.error('payload.key is not defined');
		return false;
	} 
	
	if (type==='string' && state.body.formData[payload.key] === undefined) {
		console.error('state.body.formData[payload.key] is undefined');
		return false;

	} else if (type === 'date' && state.body.formData.dates[payload.key] === undefined) {
		console.error('state.body.formData.dates[payload.key] is undefined');
		return false;
	}
	
	if (payload.content === undefined) {
		console.error('payload.content is not defined');
		return false;
	}
	
	return true;
}

export const state = () => (
	initState()
)

export const mutations = {
	
	createNew(state) {
		const id = saveNewToLocalStorage(initContract());
		this.commit("contract/loadContract", { id: id });
	},

	incrementUpdateCounter(state) {
		state.localStorageUpdateCounter++;
	},

	loadContract(state, payload) {
		const id = payload.id;

		if (!isId(id)) {
			state.loadError = true;
			state.id = -1;
			console.error(`[contract Store] invalid id given while loading the contract the id=${id}`);
			return;
		}
		
		const contract = getFromLocalStorage(id);	
		if (isNotNull(contract)) {
			state.body = contract;
			state.id = id;
			state.loadError = false;
			return;
		
		} else {
			state.loadError = true;
			state.id = -1;
			console.error(`[contract Store] contract cant be loaded contract with id:${id} = null \n Maybe it doesnt exist in the local storage`);
		}
	},

	createNewLocalCopy(state, data) {
		const id = saveNewToLocalStorage(initContract());
		const contract = getFromLocalStorage(id);
		const {contractData, tid, version} = data;

		if(isNotNull(contract, "contract is null")) {
			//if length is different
			if (Object.keys(contractData).length !== Object.keys(contract.formData).length) {
				console.warn("contract.formdata its length is different then the proposed change in payload");
			}

			for (let dataKey in contract.formData) {
				const newData = contractData[dataKey];

				if (newData != undefined) {
					contract.formData[dataKey] = newData;
				} else {
					console.warn(`the property key:${dataKey} does not exist in the payload and therefore can not be set`);
				}			
			}		

			state.body.formData = contract.formData 
			state.id = id;
		}

		state.body.tid = tid;
		state.body.version = version;

		saveToLocalStorage(contract, id);
	},

	removeFromParties(state, payload) {
		if (isValidPartyData(payload) ) {
			const currentParty = state.body.formData.parties[payload.target];
			const index = currentParty.indexOf(payload.data.id);
			if (index > -1) { // only splice array when item is found
				currentParty.splice(index, 1); // 2nd parameter means remove one item only
			}
			saveToLocalStorage(state.body, state.id);
		}
	},

	changeString(state, payload) {
		if (genericErrorChecking(payload, state) ) {
			if (isString(payload.content, `invalid ${payload.key} given`)) {
				state.body.formData[payload.key] = payload.content;
				saveToLocalStorage(state.body, state.id);
			}
		}
	},

	changeDate(state, payload) {
		if (genericErrorChecking(payload, state, 'date')) {
			if (isDate(payload.content, `invalid ${payload.key} given`)) {
				state.body.formData.dates[payload.key] = payload.content;
				saveToLocalStorage(state.body, state.id);
			}
		}
	},

	changeParties(state, payload) {
		if (isValidPartyData(payload) && isArray(payload.data, `parties[${payload.target}]_data`)) {
			state.body.formData.parties[payload.target] = payload.data;
			saveToLocalStorage(state.body, state.id);
		}
	},

	changePaymentNote(state, payload) {
		if (isString(payload, 'invalid paymentNote given')) {
			state.body.formData.payment.note = payload;
			saveToLocalStorage(state.body, state.id);
		}
	},

	changeRequiredSign(state, payload) {
		if (isBoolean(payload, 'invalid required to sign given')) {
			state.body.formData.purpose = payload;
			saveToLocalStorage(state.body, state.id);
		}
	},

	changePaymentAmount(state, payload) {
		if (isNumber(payload, 'invalid paymentAmount given')) {
			state.body.formData.payment.amount = Number.parseFloat(payload);
			saveToLocalStorage(state.body, state.id);
		}
	},

	setTid(state, payload) {
		state.body.formData.tid = payload.data;
		saveToLocalStorage(state.body, state.id);
	},

	setVerstion(state, payload) {
		state.body.formData.version = payload.data;
		saveToLocalStorage(state.body, state.id);
	},

	reset(state) {
		state.formData = initFormData();
		saveToLocalStorage(state.body, state.id);
	},
}

export const getters = {
	filtered: (state) => {
		return normalizeContract(state.body);
	},
}

function retreiveData(state) {
	const result = {};

	for (const key in state) {
		const currentProp = state[key];
		const isObject = (typeof currentProp === 'object' && !Array.isArray(currentProp));
		if (isObject) {
			const data = retreiveData(currentProp);
			if (Object.keys(data).length > 0) {
				result[key] = data;
			}
		
		} else if (Array.isArray(currentProp) ) {
			
			if (currentProp.length > 0) {
				result[key] = currentProp;
			}

		} else if (currentProp !== "" && currentProp !== null && currentProp !== undefined) {
			result[key] = currentProp;
		}
	}

	return result;
}