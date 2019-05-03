"use strict";
var playerStats = {};
var playerPatreonSettings = {};

function OnUpdateHeroSelection()
{
	for ( var teamId of Game.GetAllTeamIDs() )
	{
		UpdateTeam( teamId );
	}
}

function UpdateTeam( teamId )
{
	var teamPanelName = "team_" + teamId;
	var teamPanel = $( "#"+teamPanelName );
	var teamPlayers = Game.GetPlayerIDsOnTeam( teamId );
	teamPanel.SetHasClass( "no_players", ( teamPlayers.length == 0 ) );
	for ( var playerId of teamPlayers )
	{
		UpdatePlayer( teamPanel, playerId );
	}
}

function UpdatePlayer( teamPanel, playerId )
{
	var playerContainer = teamPanel.FindChildInLayoutFile( "PlayersContainer" );
	var playerPanelName = "player_" + playerId;
	var playerPanel = playerContainer.FindChild( playerPanelName );
	if ( playerPanel === null )
	{
		playerPanel = $.CreatePanel( "Image", playerContainer, playerPanelName );
		playerPanel.BLoadLayout( "file://{resources}/layout/custom_game/multiteam_hero_select_overlay_player.xml", false, false );
		playerPanel.AddClass( "PlayerPanel" );
	}

	var playerInfo = Game.GetPlayerInfo( playerId );
	if ( !playerInfo )
		return;

	var localPlayerInfo = Game.GetLocalPlayerInfo();
	if ( !localPlayerInfo )
		return;

	var localPlayerTeamId = localPlayerInfo.player_team_id;
	var playerPortrait = playerPanel.FindChildInLayoutFile( "PlayerPortrait" );

	if ( playerId == localPlayerInfo.player_id )
	{
		playerPanel.AddClass( "is_local_player" );
	}

	if ( playerInfo.player_selected_hero !== "" )
	{
		playerPortrait.SetImage( "file://{images}/heroes/" + playerInfo.player_selected_hero + ".png" );
		playerPanel.SetHasClass( "hero_selected", true );
		playerPanel.SetHasClass( "hero_highlighted", false );
	}
	else if ( playerInfo.possible_hero_selection !== "" && ( playerInfo.player_team_id == localPlayerTeamId ) )
	{
		playerPortrait.SetImage( "file://{images}/heroes/npc_dota_hero_" + playerInfo.possible_hero_selection + ".png" );
		playerPanel.SetHasClass( "hero_selected", false );
		playerPanel.SetHasClass( "hero_highlighted", true );
	}
	else
	{
		playerPortrait.SetImage( "file://{images}/custom_game/unassigned.png" );
	}

	var playerName = playerPanel.FindChildInLayoutFile( "PlayerName" );
	playerName.text = playerInfo.player_name;

	playerPanel.SetHasClass( "is_local_player", ( playerId == Game.GetLocalPlayerID() ) );

	var stats = playerStats[playerId];
	var hasStats = stats != null;
	playerPanel.SetHasClass("has_stats", hasStats)
	if (hasStats) {
		var playerStreak = playerPanel.FindChildInLayoutFile( "PlayerStreak" );
		playerStreak.text = 'Streak: ' + (stats.streak || 0) + '/' + (stats.bestStreak);
	}
	var patreonSettings = playerPatreonSettings[playerId];
	playerPanel.SetHasClass('IsPatreon', Boolean(patreonSettings && patreonSettings.level >= 1));
}

function UpdateTimer()
{
	var gameTime = Game.GetGameTime();
	var transitionTime = Game.GetStateTransitionTime();

	var timerValue = Math.max( 0, Math.floor( transitionTime - gameTime ) );

	if ( Game.GameStateIsAfter( DOTA_GameState.DOTA_GAMERULES_STATE_HERO_SELECTION ) )
	{
		timerValue = 0;
	}
	$("#TimerPanel").SetDialogVariableInt( "timer_seconds", timerValue );

	var bIsInBanPhase = Game.IsInBanPhase();
	$("#TimerLabel").text = $.Localize(bIsInBanPhase ? "DOTA_LoadingBanPhase" : "DOTA_LoadingPickPhase");

	$.Schedule( 0.1, UpdateTimer );
}

(function()
{
	var largeGame = Game.GetAllPlayerIDs().length > 16;
	var preMapContainer = $.GetContextPanel().GetParent().GetParent().GetParent().FindChildTraverse('PreMinimapContainer');
	preMapContainer.visible = false;

	var localPlayerTeamId = Game.GetLocalPlayerInfo().player_team_id;
	var teamsContainer = $("#HeroSelectTeamsContainer");

	var teams = 0;
	var teamsTotal = Game.GetAllTeamIDs().length;
	for (var teamId of Game.GetAllTeamIDs()) {
		teams += 1;
		var containerRoot = teamsContainer.GetChild(!largeGame || teams <= Math.ceil(teamsTotal / 2) ? 0 : 1)
		var teamPanelName = "team_" + teamId;
		var teamPanel = $.CreatePanel( "Panel", containerRoot, teamPanelName );
		containerRoot.MoveChildBefore(teamPanel, containerRoot.GetChild(containerRoot.GetChildCount() - 2));
		teamPanel.BLoadLayout( "file://{resources}/layout/custom_game/multiteam_hero_select_overlay_team.xml", false, false );
		var teamName = teamPanel.FindChildInLayoutFile( "TeamName" );
		if ( teamName )
		{
			teamName.text = $.Localize( Game.GetTeamDetails( teamId ).team_name );
		}

		var logo_xml = GameUI.CustomUIConfig().team_logo_xml;
		if ( logo_xml )
		{
			var teamLogoPanel = teamPanel.FindChildInLayoutFile( "TeamLogo" );
			teamLogoPanel.SetAttributeInt( "team_id", teamId );
			teamLogoPanel.BLoadLayout( logo_xml, false, false );
		}

		var teamGradient = teamPanel.FindChildInLayoutFile( "TeamGradient" );
		if ( teamGradient && GameUI.CustomUIConfig().team_colors )
		{
			var teamColor = GameUI.CustomUIConfig().team_colors[ teamId ];
			teamColor = teamColor.replace( ";", "" );
			var gradientText = 'gradient( linear, 0% 0%, 0% 100%, from( ' + teamColor + '40  ), to( #00000000 ) );';
			teamGradient.style.backgroundColor = gradientText;
		}

		if ( teamName )
		{
			teamName.text = $.Localize( Game.GetTeamDetails( teamId ).team_name );
		}
		teamPanel.AddClass( "TeamPanel" );
		teamPanel.AddClass(teamId === localPlayerTeamId ? "local_player_team" : "not_local_player_team");
	}

	var root = $.GetContextPanel().GetParent().GetParent().GetParent();
	SubscribeToNetTableKey('game_state', 'player_stats', function(value) {
		playerStats = value;
		OnUpdateHeroSelection();
		var localStats = playerStats[Game.GetLocalPlayerID()];
		if (!localStats) return;
		$('#PlayerStatsAverageWinsLoses').text = localStats.wins + '/' + localStats.loses;
		$('#PlayerStatsAverageKDA').text = [
			localStats.averageKills,
			localStats.averageDeaths,
			localStats.averageAssists,
		].map(Math.round).join('/');
	});

	SubscribeToNetTableKey('game_state', 'patreon_bonuses', function(value) {
		playerPatreonSettings = value;
		OnUpdateHeroSelection();
		var localStats = playerPatreonSettings[Game.GetLocalPlayerID()];
		root.SetHasClass('LocalPlayerPatreon', Boolean(localStats && localStats.level));
		$.Msg(Boolean(localStats && localStats.level))
	});

	SubscribeToNetTableKey('game_state', 'is_same_hero_day', function(value) {
		root.SetHasClass('IsSameHeroDay', Boolean(value.enable));
	});

	GameEvents.Subscribe( "dota_player_hero_selection_dirty", OnUpdateHeroSelection );
	GameEvents.Subscribe( "dota_player_update_hero_selection", OnUpdateHeroSelection );
  UpdateTimer();

  $.GetContextPanel().SetDialogVariable('map_name', Game.GetMapInfo().map_display_name);
})();

(function() {
	var root = $.GetContextPanel().GetParent().GetParent().GetParent();
	var startingItemsLeftColumn = root.FindChildTraverse("StartingItemsLeftColumn");
	startingItemsLeftColumn.Children().forEach(function(child) {
		if (child.BHasClass('PatreonBonusButtonContainer')) child.DeleteAsync(0);
	})
	var inventoryStrategyControl = root.FindChildTraverse("InventoryStrategyControl");
	inventoryStrategyControl.style.marginTop = (46 - 32) + 'px';

	var patreonBonusButton = $.CreatePanel("Panel", startingItemsLeftColumn, "");
	patreonBonusButton.BLoadLayout("file://{resources}/layout/custom_game/multiteam_hero_select_overlay_patreon_bonus_button.xml", false, true)
	startingItemsLeftColumn.MoveChildAfter(patreonBonusButton, startingItemsLeftColumn.GetChild(0));
})();

(function() {
	var root = $.GetContextPanel().GetParent().GetParent().GetParent();
	var heroPickRightColumn = root.FindChildTraverse('HeroPickRightColumn');
	var smartRandomButton = heroPickRightColumn.FindChildTraverse('smartRandomButton');
	if (smartRandomButton != null) smartRandomButton.DeleteAsync(0);

	smartRandomButton = $.CreatePanel('Button', heroPickRightColumn, 'smartRandomButton');
	smartRandomButton.BLoadLayout("file://{resources}/layout/custom_game/multiteam_hero_select_overlay_smart_random.xml", false, false)
})();

function getBans() {
	var gridCore = FindDotaHudElement("GridCore");
	var result = {};
	for (var child of gridCore.Children()) {
		if (child.BHasClass("Banned")) {
			var heroImage = child.FindChildTraverse("HeroImage");
			if (heroImage) {
				result['npc_dota_hero_' + heroImage.heroname] = true;
			}
		}
	}

	return result;
}

GameEvents.Subscribe("banned_heroes", function(event) {
	GameEvents.SendCustomGameEventToServer("banned_heroes", {
		eventId: event.eventId,
		result: getBans(),
	});
});
