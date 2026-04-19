// CharacterSelectionWidget.cpp
#include "CharacterSelectionWidget.h"
#include "Components/Image.h"
#include "Components/TextBlock.h"
#include "Components/Button.h"
#include "Components/UniformGridPanel.h"
#include "Components/UniformGridSlot.h"
#include "Components/Border.h"
#include "Blueprint/WidgetTree.h"
#include "Kismet/GameplayStatics.h"
#include "FightingGameInstance.h"
#include "Engine/Texture2D.h"

UCharacterSelectionWidget::UCharacterSelectionWidget(const FObjectInitializer& ObjectInitializer)
    : Super(ObjectInitializer)
{
    // Input handling enabled via NativeTick
    // Note: bIsFocusable is deprecated and not needed
}

void UCharacterSelectionWidget::NativeConstruct()
{
    Super::NativeConstruct();

    UE_LOG(LogTemp, Warning, TEXT("=== Character Selection Widget Constructed ==="));

    // Populate the grid with characters
    PopulateCharacterGrid();

    // Set initial focus
    SetKeyboardFocus();

    // Verify controllers
    for (int32 i = 0; i < 2; i++)
    {
        APlayerController* PC = UGameplayStatics::GetPlayerController(GetWorld(), i);
        if (PC)
        {
            UE_LOG(LogTemp, Warning, TEXT("Player Controller %d found: %s"), i, *PC->GetName());
        }
        else
        {
            UE_LOG(LogTemp, Error, TEXT("Player Controller %d NOT FOUND!"), i);
        }
    }
}

void UCharacterSelectionWidget::NativeTick(const FGeometry& MyGeometry, float InDeltaTime)
{
    Super::NativeTick(MyGeometry, InDeltaTime);

    // Update input cooldowns
    if (Player1InputCooldown > 0.0f)
    {
        Player1InputCooldown -= InDeltaTime;
    }

    if (Player2InputCooldown > 0.0f)
    {
        Player2InputCooldown -= InDeltaTime;
    }

    // Handle input for both players
    HandlePlayerInput(0, InDeltaTime);
    HandlePlayerInput(1, InDeltaTime);
}

void UCharacterSelectionWidget::HandlePlayerInput(int32 PlayerIndex, float DeltaTime)
{
    // Don't accept input if player is ready
    bool bIsReady = (PlayerIndex == 0) ? bPlayer1Ready : bPlayer2Ready;
    if (bIsReady) return;

    // Get player controller
    APlayerController* PC = UGameplayStatics::GetPlayerController(GetWorld(), PlayerIndex);
    if (!PC) return;

    // Check cooldown
    float& Cooldown = (PlayerIndex == 0) ? Player1InputCooldown : Player2InputCooldown;

    // Handle navigation (with cooldown)
    if (Cooldown <= 0.0f)
    {
        // Read gamepad left stick
        float MoveX = PC->GetInputAnalogKeyState(EKeys::Gamepad_LeftX);
        float MoveY = PC->GetInputAnalogKeyState(EKeys::Gamepad_LeftY);

        const float Threshold = 0.5f;

        int32 DeltaX = 0;
        int32 DeltaY = 0;

        if (MoveX > Threshold) DeltaX = 1;      // Right
        else if (MoveX < -Threshold) DeltaX = -1; // Left

        if (MoveY > Threshold) DeltaY = 1;      // Up
        else if (MoveY < -Threshold) DeltaY = -1;  // Down

        if (DeltaX != 0 || DeltaY != 0)
        {
            MoveCursor(PlayerIndex, DeltaX, DeltaY);
            Cooldown = InputCooldownTime;
            UE_LOG(LogTemp, Warning, TEXT("Player %d moved cursor: DeltaX=%d, DeltaY=%d"), PlayerIndex, DeltaX, DeltaY);
        }
    }

    // Handle buttons (A = Select, B = Ready)
    if (PC->WasInputKeyJustPressed(EKeys::Gamepad_FaceButton_Bottom)) // A button
    {
        ConfirmSelection(PlayerIndex);
        UE_LOG(LogTemp, Warning, TEXT("Player %d pressed A (Confirm)"), PlayerIndex);
    }

    if (PC->WasInputKeyJustPressed(EKeys::Gamepad_FaceButton_Right)) // B button
    {
        ToggleReady(PlayerIndex);
        UE_LOG(LogTemp, Warning, TEXT("Player %d pressed B (Ready)"), PlayerIndex);
    }
}



void UCharacterSelectionWidget::PopulateCharacterGrid()
{
    if (!CharacterGrid || AvailableCharacters.Num() == 0)
    {
        UE_LOG(LogTemp, Warning, TEXT("PopulateCharacterGrid: CharacterGrid is null or no characters available!"));
        return;
    }

    CharacterGrid->ClearChildren();
    CharacterCardWidgets.Empty();

    UE_LOG(LogTemp, Warning, TEXT("Populating grid with %d characters"), AvailableCharacters.Num());

    for (int32 i = 0; i < AvailableCharacters.Num(); i++)
    {
        UCharacterDataAsset* CharData = AvailableCharacters[i];
        if (!CharData)
        {
            UE_LOG(LogTemp, Warning, TEXT("Character at index %d is null!"), i);
            continue;
        }

        // Create border for the card
        UBorder* CardBorder = WidgetTree->ConstructWidget<UBorder>(UBorder::StaticClass());
        CardBorder->SetPadding(FMargin(5.0f));

        // Set default border color (dark gray)
        CardBorder->SetBrushColor(FLinearColor(0.2f, 0.2f, 0.2f, 1.0f));

        // Create image for character icon
        UImage* CharIcon = WidgetTree->ConstructWidget<UImage>(UImage::StaticClass());
        if (CharData->CharacterIcon)
        {
            CharIcon->SetBrushFromTexture(CharData->CharacterIcon);
            // Deprecated API: UImage::SetBrushSize is deprecated. Use SetDesiredSizeOverride instead.
            CharIcon->SetDesiredSizeOverride(FVector2D(128.0f, 128.0f));
            UE_LOG(LogTemp, Log, TEXT("Set icon for %s"), *CharData->CharacterName.ToString());
        }
        else
        {
            // Fallback: colored box if no icon
            CharIcon->SetColorAndOpacity(FLinearColor::White);
            UE_LOG(LogTemp, Warning, TEXT("No icon for %s"), *CharData->CharacterName.ToString());
        }

        // Add image to border
        CardBorder->SetContent(CharIcon);

        // Calculate grid position
        int32 Row = i / GridColumns;
        int32 Column = i % GridColumns;

        // Add to grid
        UUniformGridSlot* GridSlot = CharacterGrid->AddChildToUniformGrid(CardBorder, Row, Column);
        GridSlot->SetHorizontalAlignment(HAlign_Fill);
        GridSlot->SetVerticalAlignment(VAlign_Fill);

        CharacterCardWidgets.Add(CardBorder);

        UE_LOG(LogTemp, Log, TEXT("Added character %s to grid at [%d, %d]"), *CharData->CharacterName.ToString(), Row, Column);
    }

    // Update initial highlights
    UpdateCursorHighlights();

    // Initialize preview displays
    UpdatePlayerDisplay(0);
    UpdatePlayerDisplay(1);
}

void UCharacterSelectionWidget::MoveCursor(int32 PlayerIndex, int32 DeltaX, int32 DeltaY)
{
    int32& CursorIndex = (PlayerIndex == 0) ? Player1CursorIndex : Player2CursorIndex;

    // Calculate current row and column
    int32 CurrentRow = CursorIndex / GridColumns;
    int32 CurrentCol = CursorIndex % GridColumns;

    // Apply delta
    int32 NewRow = CurrentRow + DeltaY;
    int32 NewCol = CurrentCol + DeltaX;

    // Calculate total rows
    int32 TotalRows = FMath::CeilToInt((float)AvailableCharacters.Num() / (float)GridColumns);

    // Wrap around
    if (NewRow < 0) NewRow = TotalRows - 1;
    if (NewRow >= TotalRows) NewRow = 0;

    if (NewCol < 0) NewCol = GridColumns - 1;
    if (NewCol >= GridColumns) NewCol = 0;

    // Calculate new index
    int32 NewIndex = NewRow * GridColumns + NewCol;

    // Clamp to available characters
    if (NewIndex >= AvailableCharacters.Num())
    {
        NewIndex = AvailableCharacters.Num() - 1;
    }

    CursorIndex = NewIndex;

    UE_LOG(LogTemp, Log, TEXT("Player %d cursor moved to index %d"), PlayerIndex, CursorIndex);

    // Update highlights
    UpdateCursorHighlights();

    // Update preview (if not already selected)
    UCharacterDataAsset* PreviewChar = AvailableCharacters[CursorIndex];
    if (PlayerIndex == 0 && !Player1SelectedCharacter)
    {
        Player1SelectedCharacter = PreviewChar;
        UpdatePlayerDisplay(0);
    }
    else if (PlayerIndex == 1 && !Player2SelectedCharacter)
    {
        Player2SelectedCharacter = PreviewChar;
        UpdatePlayerDisplay(1);
    }
}

void UCharacterSelectionWidget::ConfirmSelection(int32 PlayerIndex)
{
    int32 CursorIndex = (PlayerIndex == 0) ? Player1CursorIndex : Player2CursorIndex;

    if (CursorIndex < 0 || CursorIndex >= AvailableCharacters.Num()) return;

    UCharacterDataAsset* SelectedChar = AvailableCharacters[CursorIndex];
    if (!SelectedChar) return;

    if (PlayerIndex == 0)
    {
        Player1SelectedCharacter = SelectedChar;
        UE_LOG(LogTemp, Warning, TEXT("Player 1 selected: %s"), *SelectedChar->CharacterName.ToString());
    }
    else
    {
        Player2SelectedCharacter = SelectedChar;
        UE_LOG(LogTemp, Warning, TEXT("Player 2 selected: %s"), *SelectedChar->CharacterName.ToString());
    }

    UpdatePlayerDisplay(PlayerIndex);
    UpdateCursorHighlights();
}

void UCharacterSelectionWidget::ToggleReady(int32 PlayerIndex)
{
    UCharacterDataAsset* SelectedChar = (PlayerIndex == 0) ? Player1SelectedCharacter : Player2SelectedCharacter;

    // Must have selected a character first
    if (!SelectedChar)
    {
        UE_LOG(LogTemp, Warning, TEXT("Player %d tried to ready without selecting a character!"), PlayerIndex);
        return;
    }

    if (PlayerIndex == 0)
    {
        bPlayer1Ready = !bPlayer1Ready;

        if (Player1ReadyButtonText)
        {
            Player1ReadyButtonText->SetText(bPlayer1Ready ? FText::FromString("READY!") : FText::FromString("NOT READY"));
        }

        UE_LOG(LogTemp, Log, TEXT("Player 1 ready state: %s"), bPlayer1Ready ? TEXT("READY") : TEXT("NOT READY"));
    }
    else
    {
        bPlayer2Ready = !bPlayer2Ready;

        if (Player2ReadyButtonText)
        {
            Player2ReadyButtonText->SetText(bPlayer2Ready ? FText::FromString("READY!") : FText::FromString("NOT READY"));
        }

        UE_LOG(LogTemp, Log, TEXT("Player 2 ready state: %s"), bPlayer2Ready ? TEXT("READY") : TEXT("NOT READY"));
    }

    CheckBothPlayersReady();
}

void UCharacterSelectionWidget::UpdatePlayerDisplay(int32 PlayerIndex)
{
    UCharacterDataAsset* CharData = (PlayerIndex == 0) ? Player1SelectedCharacter : Player2SelectedCharacter;

    if (!CharData) return;

    if (PlayerIndex == 0)
    {
        // Update Player 1 display
        if (Player1Portrait && CharData->CharacterPortrait)
        {
            Player1Portrait->SetBrushFromTexture(CharData->CharacterPortrait);
        }

        if (Player1CharacterName)
        {
            /* Player1CharacterName->SetText(CharData->CharacterName);*/
            Player1CharacterName->SetText(CharData->CharacterName);

            FString DisplayText = FString::Printf(TEXT("%s\n[%s]"),
                *CharData->CharacterName.ToString(),
                *CharData->CharacterElement.ToString());
            Player1CharacterName->SetText(FText::FromString(DisplayText));
        }

        if (Player1HealthText)
        {
            Player1HealthText->SetText(FText::Format(FText::FromString("Health: {0}"), FText::AsNumber(CharData->MaxHealth)));
        }

        if (Player1ManaText)
        {
            Player1ManaText->SetText(FText::Format(FText::FromString("Mana: {0}"), FText::AsNumber(CharData->MaxMana)));
        }

        if (Player1StaminaText)
        {
            Player1StaminaText->SetText(FText::Format(FText::FromString("Stamina: {0}"), FText::AsNumber(CharData->MaxStamina)));
        }
    }
    else
    {
        // Update Player 2 display
        if (Player2Portrait && CharData->CharacterPortrait)
        {
            Player2Portrait->SetBrushFromTexture(CharData->CharacterPortrait);
        }

        if (Player2CharacterName)
        {
            /* Player2CharacterName->SetText(CharData->CharacterName);*/
            Player2CharacterName->SetText(CharData->CharacterName);

            FString DisplayText = FString::Printf(TEXT("%s\n[%s]"),
                *CharData->CharacterName.ToString(),
                *CharData->CharacterElement.ToString());
            Player2CharacterName->SetText(FText::FromString(DisplayText));
        }

        if (Player2HealthText)
        {
            Player2HealthText->SetText(FText::Format(FText::FromString("Health: {0}"), FText::AsNumber(CharData->MaxHealth)));
        }

        if (Player2ManaText)
        {
            Player2ManaText->SetText(FText::Format(FText::FromString("Mana: {0}"), FText::AsNumber(CharData->MaxMana)));
        }

        if (Player2StaminaText)
        {
            Player2StaminaText->SetText(FText::Format(FText::FromString("Stamina: {0}"), FText::AsNumber(CharData->MaxStamina)));
        }
    }
}

void UCharacterSelectionWidget::UpdateCursorHighlights()
{
    // Reset all borders first
    for (int32 i = 0; i < CharacterCardWidgets.Num(); i++)
    {
        UBorder* CardBorder = Cast<UBorder>(CharacterCardWidgets[i]);
        if (CardBorder)
        {
            // Default color - dark gray
            CardBorder->SetBrushColor(FLinearColor(0.2f, 0.2f, 0.2f, 1.0f));
        }
    }

    // Highlight Player 1 cursor
    if (Player1CursorIndex >= 0 && Player1CursorIndex < CharacterCardWidgets.Num())
    {
        UBorder* CardBorder = Cast<UBorder>(CharacterCardWidgets[Player1CursorIndex]);
        if (CardBorder)
        {
            // Blue highlight for Player 1
            FLinearColor Player1Color = bPlayer1Ready ? FLinearColor(0.0f, 1.0f, 0.0f, 1.0f) : FLinearColor(0.3f, 0.5f, 1.0f, 1.0f);
            CardBorder->SetBrushColor(Player1Color);
        }
    }

    // Highlight Player 2 cursor
    if (Player2CursorIndex >= 0 && Player2CursorIndex < CharacterCardWidgets.Num())
    {
        UBorder* CardBorder = Cast<UBorder>(CharacterCardWidgets[Player2CursorIndex]);
        if (CardBorder)
        {
            // Red highlight for Player 2
            FLinearColor Player2Color = bPlayer2Ready ? FLinearColor(0.0f, 1.0f, 0.0f, 1.0f) : FLinearColor(1.0f, 0.3f, 0.3f, 1.0f);
            CardBorder->SetBrushColor(Player2Color);
        }
    }
}

void UCharacterSelectionWidget::CheckBothPlayersReady()
{
    if (bPlayer1Ready && bPlayer2Ready)
    {
        UE_LOG(LogTemp, Warning, TEXT("Both players ready! Starting match..."));
        StartMatch();
    }
}

void UCharacterSelectionWidget::StartMatch()
{
    // Store selections in Game Instance
    UFightingGameInstance* GameInstance = Cast<UFightingGameInstance>(UGameplayStatics::GetGameInstance(GetWorld()));
    if (GameInstance)
    {
        GameInstance->Player1SelectedCharacterData = Player1SelectedCharacter;
        GameInstance->Player2SelectedCharacterData = Player2SelectedCharacter;

        UE_LOG(LogTemp, Warning, TEXT("Stored selections in Game Instance. Loading VS Screen..."));

        // Load VS Screen first (not TestLevel directly)
        UGameplayStatics::OpenLevel(GetWorld(), FName("VSScreenLevel"));
    }
    else
    {
        UE_LOG(LogTemp, Error, TEXT("Failed to get Game Instance!"));
    }
}