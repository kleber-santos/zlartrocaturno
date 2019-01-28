/*global location history */
sap.ui.define([
	"whr/com/br/ZLARTrocaTurno/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"whr/com/br/ZLARTrocaTurno/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"
], function (BaseController, JSONModel, formatter, Filter, FilterOperator) {
	"use strict";

	return BaseController.extend("whr.com.br.ZLARTrocaTurno.controller.Worklist", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the worklist controller is instantiated.
		 * @public
		 */
		onInit: function () {
			var oViewModel,
				iOriginalBusyDelay,
				oTable = this.byId("table");

			// Put down worklist table's original value for busy indicator delay,
			// so it can be restored later on. Busy handling on the table is
			// taken care of by the table itself.
			iOriginalBusyDelay = oTable.getBusyIndicatorDelay();
			// keeps the search state
			this._aTableSearchState = [];

			// Model used to manipulate control states
			oViewModel = new JSONModel({
				worklistTableTitle: this.getResourceBundle().getText("worklistTableTitle"),
				shareOnJamTitle: this.getResourceBundle().getText("worklistTitle"),
				shareSendEmailSubject: this.getResourceBundle().getText("shareSendEmailWorklistSubject"),
				shareSendEmailMessage: this.getResourceBundle().getText("shareSendEmailWorklistMessage", [location.href]),
				tableNoDataText: this.getResourceBundle().getText("tableNoDataText"),
				tableBusyDelay: 0
			});

			this.carregarDescHorario();
			this.setModel(oViewModel, "worklistView");

			// Make sure, busy indication is showing immediately so there is no
			// break after the busy indication for loading the view's meta data is
			// ended (see promise 'oWhenMetadataIsLoaded' in AppController)
			oTable.attachEventOnce("updateFinished", function () {
				// Restore original busy indicator delay for worklist's table
				oViewModel.setProperty("/tableBusyDelay", iOriginalBusyDelay);
			});
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Triggered by the table's 'updateFinished' event: after new table
		 * data is available, this handler method updates the table counter.
		 * This should only happen if the update was successful, which is
		 * why this handler is attached to 'updateFinished' and not to the
		 * table's list binding's 'dataReceived' method.
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
		onUpdateFinished: function (oEvent) {
			// update the worklist's object counter after the table update
			var sTitle,
				oTable = oEvent.getSource(),
				iTotalItems = oEvent.getParameter("total");
			// only update the counter if the length is final and
			// the table is not empty
			if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
				sTitle = this.getResourceBundle().getText("worklistTableTitleCount", [iTotalItems]);
			} else {
				sTitle = this.getResourceBundle().getText("worklistTableTitle");
			}
			this.getModel("worklistView").setProperty("/worklistTableTitle", sTitle);
		},

		/**
		 * Event handler when a table item gets pressed
		 * @param {sap.ui.base.Event} oEvent the table selectionChange event
		 * @public
		 */
		onPress: function (oEvent) {
			// The source is the list item that got pressed
			this._showObject(oEvent.getSource());
		},

		/**
		 * Event handler for navigating back.
		 * We navigate back in the browser historz
		 * @public
		 */
		onNavBack: function () {
			history.go(-1);
		},

		onSearch: function (oEvent) {
			if (oEvent.getParameters().refreshButtonPressed) {
				// Search field's 'refresh' button has been pressed.
				// This is visible if you select any master list item.
				// In this case no new search is triggered, we only
				// refresh the list binding.
				this.onRefresh();
			} else {
				var aTableSearchState = [];
				var sQuery = oEvent.getParameter("query");

				if (sQuery && sQuery.length > 0) {
					aTableSearchState = [new Filter("Horario", FilterOperator.Contains, sQuery)];
				}
				this._applySearch(aTableSearchState);
			}

		},

		/**
		 * Event handler for refresh event. Keeps filter, sort
		 * and group settings and refreshes the list binding.
		 * @public
		 */
		onRefresh: function () {
			var oTable = this.byId("table");
			oTable.getBinding("items").refresh();
		},

		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */

		/**
		 * Shows the selected item on the object page
		 * On phones a additional history entry is created
		 * @param {sap.m.ObjectListItem} oItem selected Item
		 * @private
		 */
		_showObject: function (oItem) {
			this.getRouter().navTo("object", {
				objectId: oItem.getBindingContext().getProperty("Data")
			});
		},
		carregarDescHorario: function () {

			try {

				var sServiceUrl = "/sap/opu/odata/SAP/ZLAR_TIMEWEB_SRV";
				// create OData model instance with service URL and JSON format
				var oModel = new sap.ui.model.odata.ODataModel(sServiceUrl, true);
				sap.ui.getCore().setModel(oModel);
				var that = this;
				that.getView().setBusy(true);

				oModel.read("/MC_DESCHORARIOSet",
					undefined,
					undefined,
					false,
					function _OnSuccess(oData, response) {
						var jSONModel = new sap.ui.model.json.JSONModel();

						jSONModel.setData(oData);
						that.getView().setModel(jSONModel, "descHorarioModel");
					},
					function _OnError(oError) {}
				);

				var descHorario = this.getView().getModel("descHorarioModel");

				var horarioContratual;

				for (var y = 0; y < descHorario.oData.results.length; y++) {
					horarioContratual = descHorario.oData.results[y].Ev_Rtext;
					break;
				}

				var cabecalho = {
					horarioContratual: horarioContratual,
				};
				var oModel2 = new JSONModel(cabecalho);
				this.getView().setModel(oModel2, "cabecalhoModel");

			} catch (ex) {}
			that.getView().setBusy(false);
		},
		formatDate: function (v) {

			jQuery.sap.require("sap.ui.core.format.DateFormat");

			var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
				pattern: "dd/MM/YYYY"
			});

			return oDateFormat.format(new Date(v));

		},

		onPesquisar: function (oEvent) {

			var horarioModel = sap.ui.getCore().getModel("horariomodel");
			var horarioID;
			if (horarioModel != undefined) {
				horarioID = horarioModel.oData.horario;
			}
			var begda = this.getView().byId("DataInicio").getValue();
			//var endda =  this.getView().byId("DataFim").getValue();

			var that = this;
			that.getView().setBusy(true);

			var aFilters = [];
			if (begda !== "") {
				aFilters.push(new Filter("Begda", FilterOperator.EQ, begda));
			}
			//aFilters.push(new Filter("Pernr", FilterOperator.EQ, ''));
			if (horarioID !== "" & horarioID !== undefined) {

				aFilters.push(new Filter("Schkz", FilterOperator.EQ, horarioID));
			}
			var oBinding = this.byId("table").getBinding("items");
			oBinding.filter(aFilters);
			that.getView().setBusy(false);

		},
		onchangeComboPeriodo: function (oEvent) {
			var horarioID = oEvent.getParameter("selectedItem").getKey();

			var globalModel = new sap.ui.model.json.JSONModel();
			globalModel.setData({
				horario: horarioID,
			});
			sap.ui.getCore().setModel(globalModel, 'horariomodel');

		},

		onGravar: function () {

			var horarioModel = sap.ui.getCore().getModel("horariomodel");
			var horarioID;
			if (horarioModel != undefined) {
				horarioID = horarioModel.oData.horario;
			}
			var begda = this.getView().byId("DataInicio").getValue();

			try {

				var sServiceUrl = "/sap/opu/odata/SAP/ZLAR_TIMEWEB_SRV";
				// create OData model instance with service URL and JSON format
				var oModel = new sap.ui.model.odata.ODataModel(sServiceUrl, true);

				var that = this;
				that.getView().setBusy(true);

				var oEntry = {};
				if (begda !== "") {

					var begdaStr = begda + "T00:00:00";

					oEntry.IvBegda = begdaStr;
				}

				if (horarioID !== "" & horarioID !== undefined) {

					oEntry.IvSchzk = horarioID;
				}

				//oEntry.IvPernr

				oModel.create("/TROCATURNOSAVESet",
					oEntry,
					undefined,
					false,
					function _OnSuccess(oData, response) {
						sap.m.MessageBox.success("Gravado com sucesso!", {
							title: "Sucesso",
							initialFocus: null
						});
					},
					function _OnError(oError) {
						var message = JSON.parse(Error.response.body);

						var msgText = message.error.message.value;

						//sap.m.MessageBox.show(msgText, sap.m.MessageBox.Icon.ERROR);
						sap.m.MessageBox.error(msgText, {
							title: "Erro",
							initialFocus: null
						});
					}
				);

				//oModel.read("/CABECALHO_PERFILSet('1')", { success : (oData, response) => { debugger; } });

			} catch (ex) {}
			that.getView().setBusy(false);
		},
		/**
		 * Internal helper method to apply both filter and search state together on the list binding
		 * @param {sap.ui.model.Filter[]} aTableSearchState An array of filters for the search
		 * @private
		 */
		_applySearch: function (aTableSearchState) {
			var oTable = this.byId("table"),
				oViewModel = this.getModel("worklistView");
			oTable.getBinding("items").filter(aTableSearchState, "Application");
			// changes the noDataText of the list in case there are no filter results
			if (aTableSearchState.length !== 0) {
				oViewModel.setProperty("/tableNoDataText", this.getResourceBundle().getText("worklistNoDataWithSearchText"));
			}
		}

	});
});