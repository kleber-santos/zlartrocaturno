sap.ui.define([
	"sap/ui/test/Opa5",
	"./arrangements/Arrangement",
	"./WorklistJourney",
	"./NavigationJourney",
	"./NotFoundJourney",
	"./ObjectJourney"
], function (Opa5, Arrangement) {
	"use strict";

	Opa5.extendConfig({
		arrangements: new Arrangement(),
		viewNamespace: "whr.com.br.ZLARTrocaTurno.view.",
		autoWait: true
	});

});