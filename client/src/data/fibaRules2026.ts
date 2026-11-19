export type FibaDiagramId =
  | 'full-court'
  | 'restricted-area'
  | 'backboard-ring'
  | 'table-officials'
  | 'signals-scoresheet';

export interface FibaArticle {
  id: string;
  code: string;
  title: string;
  summary: string;
  clauses: string[];
  badge2026?: string;
  diagram?: FibaDiagramId;
}

export interface FibaRuleSection {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  articles: FibaArticle[];
}

export const FIBA_MANUAL_META = {
  title: 'FIBA Official Basketball Rules 2026',
  version: 'v1.1 · Valid as of 1st October 2026',
  approved: 'Approved by FIBA Central Board · Berlin, Germany, 23rd April 2026',
  sourceUrl: 'https://assets.fiba.basketball/image/upload/documents-corporate-fiba-official-rules-2026-v1-1.pdf',
};

export const FIBA_RULES_SECTIONS: FibaRuleSection[] = [
  {
    id: 'rule-1',
    number: 'RULE ONE',
    title: 'The Game',
    subtitle: 'Article 1 · Core definitions and objective',
    articles: [
      {
        id: 'art-1',
        code: 'Article 1',
        title: 'Definitions',
        summary: 'Basketball is played by 2 teams of 5 players each. The aim of each team is to score in the opponents’ basket and to prevent the other team from scoring.',
        badge2026: '2026 Updated',
        clauses: [
          '1.1 Basketball game: Played by 2 teams of 5 players each on the court, controlled by the referees, table officials and a commissioner, if present.',
          '1.2 Basket: Opponents’/own: The basket that is attacked by a team is the opponents’ basket and the basket which is defended by a team is its own basket.',
          '1.3 Winner of a game: The team that has scored the greater number of points at the end of playing time shall be the winner.',
        ],
      },
    ],
  },
  {
    id: 'rule-2',
    number: 'RULE TWO',
    title: 'Court and Equipment',
    subtitle: 'Articles 2–3 · Dimensions, lines, zones, and apparatus',
    articles: [
      {
        id: 'art-2',
        code: 'Article 2',
        title: 'Court',
        summary: 'Flat, hard surface free from obstructions measuring 28 m in length by 15 m in width from the inner edge of the boundary lines.',
        badge2026: '2026 Updated',
        diagram: 'full-court',
        clauses: [
          '2.1 Playing court: 28 m long × 15 m wide. Minimum ceiling height is 7.00 m.',
          '2.2 Lines: All boundary lines are 0.05 m (5 cm) wide and clearly visible. Sidelines and endlines must be the same colour; paired court markings must match on both half-courts.',
          '2.3 Backcourt & Frontcourt: A team’s frontcourt consists of the opponents’ basket, the inbounds part of the backboard, and that part of the playing court limited by the endline behind the opponents’ basket, the sidelines and the inner edge of the centre line nearest to the opponents’ basket.',
          '2.4 Restricted area & No-charge semi-circle: Rectangular area 4.90 m wide × 5.80 m long. No-charge semi-circle radius is 1.25 m measured from the centre of the ring.',
          '2.5 3-point goal area: Arc of radius 6.75 m from the point on the floor directly beneath the exact centre of the opponents’ ring, parallel to the sidelines at 0.90 m from the inner edge.',
          '2.6 Throw-in lines: Two 0.15 m lines marked outside the court opposite the scorer’s table, 8.325 m from the inner edge of the nearest endline (top of the 3-point arc).',
          '2.7 Team bench areas: Marked outside the playing court limited by 2 lines (2 m long), with 16 seats available for team bench personnel.',
        ],
      },
      {
        id: 'art-3',
        code: 'Article 3',
        title: 'Equipment',
        summary: 'Backstop units, backboards, baskets, basketballs, game clock, shot clock, and scoresheet.',
        diagram: 'backboard-ring',
        clauses: [
          '3.1 Backboards: 1.80 m horizontally × 1.05 m vertically, mounted 1.20 m inside the endline with lower edge 2.90 m above the floor.',
          '3.2 Baskets: Solid steel ring with inside diameter 0.45 m, positioned horizontally 3.05 m above the floor.',
          '3.3 Basketball: Spherical, approved synthetic/leather; Men Size 7 (749–780 mm, 567–650 g), Women Size 6 (724–737 mm, 510–567 g).',
          '3.4 Technical equipment: Game clock, scoreboard, shot clock (24s / 14s), stopwatch, two separate loud sound signals, and official FIBA scoresheet.',
        ],
      },
    ],
  },
  {
    id: 'rule-3',
    number: 'RULE THREE',
    title: 'Teams',
    subtitle: 'Articles 4–7 · Rosters, uniforms, injuries, captain, and coaches',
    articles: [
      {
        id: 'art-4',
        code: 'Article 4',
        title: 'Teams',
        summary: 'Maximum 12 team members entitled to play (including 1 captain), 1 head coach, and up to 8 accompanying delegation members.',
        badge2026: '2026 Updated',
        clauses: [
          '4.1 Definition: A team member is eligible to play when authorised to play for a team according to the regulations of the organising body.',
          '4.2 Rule: Each team shall consist of no more than 12 team members entitled to play, including a captain, a head coach, and a maximum of 8 accompanying delegation members (including a first assistant coach).',
          '4.3 Uniforms: Shirts of the same dominant colour front and back, tucked into playing shorts. Numbers 0, 00, and 1–99 clearly visible (front ≥ 8 cm high, back ≥ 16 cm high).',
          '4.4 Other equipment: Arm/leg compression sleeves, headbands, wristbands, and tapings on a team must all be of the same solid colour. No jewellery or objects that may cause injury.',
        ],
      },
      {
        id: 'art-5',
        code: 'Article 5',
        title: 'Players: Injury and assistance',
        summary: 'Stopping play for injury, bleeding/open wounds, and mandatory substitution rules.',
        clauses: [
          '5.1 Referees may stop the game immediately if a player is injured. If the ball is live when an injury occurs, the whistle is withheld until the team in control shoots, loses control, withholds the ball, or the ball becomes dead—unless immediate protection is needed.',
          '5.2 Any player who is bleeding or has an open wound must be substituted immediately and may return only after bleeding has stopped and the wound is completely covered.',
          '5.3 If an injured player cannot continue immediately (within ~15 seconds) or receives bench assistance, they must be substituted—unless a time-out is granted in the same clock-stopped period and recovery completes before the referee beckons a substitute.',
        ],
      },
      {
        id: 'art-6',
        code: 'Article 6',
        title: 'Captain: Duties and powers',
        summary: 'The captain (CAP) represents the team on the court and communicates courteously with referees.',
        clauses: [
          '6.1 The captain may communicate in a courteous manner with the referees during the game to obtain information, only when the ball is dead and the game clock is stopped.',
          '6.2 The captain shall inform the crew chief no later than 15 minutes after the end of the game if the team is protesting against the result, and sign the scoresheet in the ‘Captain’s signature in case of protest’ space.',
        ],
      },
      {
        id: 'art-7',
        code: 'Article 7',
        title: 'Head coach and first assistant coach: Duties and powers',
        summary: 'Submitting team lists at least 40 minutes before tip-off, confirming starting 5 at 10 minutes, and bench conduct.',
        clauses: [
          '7.1 At least 40 minutes before the game, the head coach or representative shall give the scorer a list with names and numbers of eligible team members, captain, head coach, and first assistant coach.',
          '7.2 At least 10 minutes before the game, the head coach shall confirm agreement with the names/numbers on the scoresheet by signing it and indicate the 5 starting players.',
          '7.3 Only the head coach is permitted to remain standing during the game and address players verbally within the team bench area. The first assistant coach assumes duties if the head coach cannot continue.',
        ],
      },
    ],
  },
  {
    id: 'rule-4',
    number: 'RULE FOUR',
    title: 'Playing Regulations',
    subtitle: 'Articles 8–21 · Game timing, jump ball, shooting, throw-ins, time-outs, and subs',
    articles: [
      {
        id: 'art-8',
        code: 'Article 8',
        title: 'Playing time, tied score and overtime',
        summary: '4 quarters of 10 minutes each, 15-minute half-time, 2-minute intervals, and 5-minute overtimes.',
        clauses: [
          '8.1 The game shall consist of 4 quarters of 10 minutes each.',
          '8.2 There shall be an interval of play of 20 minutes before the game is scheduled to begin.',
          '8.3 There shall be intervals of play of 2 minutes between the first and second quarter (first half), between the third and fourth quarter (second half), and before each overtime.',
          '8.4 There shall be a half-time interval of play of 15 minutes.',
          '8.5 If the score is tied at the end of the fourth quarter, the game shall continue with as many overtimes of 5 minutes duration each as necessary to break the tie. Teams continue attacking the same baskets as in the 3rd and 4th quarters.',
        ],
      },
      {
        id: 'art-9',
        code: 'Article 9',
        title: 'Start and end of a quarter, overtime or the game',
        summary: 'First quarter begins when the ball is legally tapped at the jump ball; other periods begin on throw-in.',
        clauses: [
          '9.1 The first quarter begins when the ball leaves the hand(s) of the crew chief on the toss for the jump ball in the centre circle.',
          '9.2 All other quarters or overtimes begin when the ball is at the disposal of the player taking the throw-in.',
          '9.3 The game cannot begin if one of the teams is not on the playing court with 5 players ready to play.',
          '9.4 A quarter, overtime or game ends when the game clock signal sounds for the end of the playing time.',
        ],
      },
      {
        id: 'art-10',
        code: 'Article 10',
        title: 'Status of the ball',
        summary: 'When the ball becomes live versus when it becomes dead.',
        clauses: [
          '10.1 The ball can be either live or dead.',
          '10.2 Ball becomes live: (a) On jump ball, when ball leaves crew chief’s hand(s) on toss; (b) On free throw, when ball is at disposal of free-throw shooter; (c) On throw-in, when ball is at disposal of player taking throw-in.',
          '10.3 Ball becomes dead: Any field goal or free throw is made; a referee blows the whistle while ball is live; ball will not enter basket on a free throw followed by another free throw or penalty; game clock or shot clock signal sounds while ball is live.',
          '10.4 The ball does not become dead and the goal counts if made when the ball is in flight on a shot for a field goal and a referee blows the whistle, or the game clock / shot clock signal sounds.',
        ],
      },
      {
        id: 'art-11',
        code: 'Article 11',
        title: 'Location of a player and a referee',
        summary: 'Location is determined by where a player is touching the floor; airborne players retain the status of their last floor contact.',
        clauses: [
          '11.1 The location of a player is determined by where they are touching the floor.',
          '11.2 While airborne, a player retains the same status they had when last touching the floor (boundary lines, centre line, 3-point line, free-throw line, and restricted area lines).',
          '11.3 Location of a referee is determined in the same manner as that of a player. When the ball touches a referee, it is the same as touching the floor at the referee’s location.',
        ],
      },
      {
        id: 'art-12',
        code: 'Article 12',
        title: 'Jump ball and alternating possession',
        summary: 'Opening jump ball rules, held ball situations, and alternating possession arrow procedures.',
        clauses: [
          '12.1 Jump ball occurs when a referee tosses the ball in the centre circle between any 2 opponents at the beginning of the first quarter.',
          '12.2 Jump ball situations include: held ball, out-of-bounds where referees are in doubt or disagree, double free-throw violation on last free throw, live ball lodging between ring and backboard, or neutral dead ball.',
          '12.3 Alternating possession: The team that does not gain control of the live ball on the playing court after the opening jump ball is entitled to the first alternating possession throw-in.',
          '12.4 The direction of the alternating possession arrow is reversed immediately when the alternating possession throw-in ends (when the ball touches or is legally touched by a player on the court).',
        ],
      },
      {
        id: 'art-13',
        code: 'Article 13',
        title: 'How the ball is played',
        summary: 'Played with the hand(s) only; kicking or striking with the fist is a violation.',
        clauses: [
          '13.1 During the game, the ball is played with the hand(s) only and may be passed, thrown, tapped, rolled or dribbled in any direction.',
          '13.2 A player shall not run with the ball, deliberately kick or block it with any part of the leg, or strike it with the fist. Accidentally touching the ball with any part of the leg is not a violation.',
        ],
      },
      {
        id: 'art-14',
        code: 'Article 14',
        title: 'Control of the ball',
        summary: 'Defines individual player control and team control.',
        clauses: [
          '14.1 Team control starts when a player of that team is in control of a live ball by holding or dribbling it or has a live ball at their disposal.',
          '14.2 Team control continues when a player of that team is in control of a live ball or the ball is being passed between teammates.',
          '14.3 Team control ends when an opponent gains control, the ball becomes dead, or the ball has left the player’s hand(s) on a shot for a field goal or for a free throw.',
        ],
      },
      {
        id: 'art-15',
        code: 'Article 15',
        title: 'Player in the act of shooting',
        summary: 'Start and end of the act of shooting for stationary shots, continuous motion drives, and airborne shots.',
        badge2026: '2026 Updated',
        clauses: [
          '15.1 A shot for a field goal or a free throw is when the ball is held in a player’s hand(s) and is then thrown into the air towards the opponents’ basket.',
          '15.2 The act of shooting begins when the player starts the continuous movement normally preceding the release of the ball and, in the judgement of a referee, has started an attempt to score.',
          '15.3 For a player in the air, the act of shooting continues until the attempt is completed (ball has left the hand(s)) and the player has returned with both feet to the floor.',
        ],
      },
      {
        id: 'art-16',
        code: 'Article 16',
        title: 'Goal: When made and its value',
        summary: '1 point for free throw, 2 points inside 3-point arc, 3 points outside 3-point arc.',
        clauses: [
          '16.1 A goal is made when a live ball enters the basket from above and remains within or passes through the basket entirely.',
          '16.2 Values: Free throw = 1 point; 2-point field goal area = 2 points; 3-point field goal area = 3 points; after ball has touched the ring on a last free throw and is legally touched before entering = 2 points.',
          '16.3 If a player accidentally scores a field goal in their own basket, the goal counts 2 points and is recorded on the scoresheet as having been scored by the captain of the opposing team on the playing court.',
        ],
      },
      {
        id: 'art-17',
        code: 'Article 17',
        title: 'Throw-in',
        summary: '5-second release limit, 1 m lateral movement, and frontcourt throw-in line rules in the last 2 minutes.',
        clauses: [
          '17.1 A throw-in occurs when the ball is passed into the playing court by the out-of-bounds player taking the throw-in.',
          '17.2 The player taking the throw-in shall not take more than 5 seconds to release the ball, nor step onto the playing court while having the ball in hand(s).',
          '17.3 During the last 2 minutes of the 4th quarter and of each overtime, following a time-out granted to the team entitled to possession in its backcourt, the subsequent throw-in shall be administered at the throw-in line in the team’s frontcourt (unless the head coach chooses the backcourt).',
        ],
      },
      {
        id: 'art-18',
        code: 'Article 18',
        title: 'Time-out',
        diagram: 'signals-scoresheet',
        summary: '60-second duration; 2 in first half, 3 in second half (max 2 in last 2 minutes), 1 per overtime.',
        clauses: [
          '18.1 A time-out is an interruption of the game requested by the head coach or first assistant coach, lasting 1 minute (60 seconds).',
          '18.2 Entitlement: 2 time-outs during the first half; 3 time-outs during the second half with a maximum of 2 of these time-outs when the game clock shows 2:00 minutes or less in the 4th quarter; 1 time-out during each overtime.',
          '18.3 Unused time-outs may not be carried over to the next half or overtime.',
          '18.4 A time-out opportunity begins when the ball becomes dead, the game clock is stopped, and the referee has ended communication with the scorer’s table; or for the non-scoring team when a field goal is scored.',
        ],
      },
      {
        id: 'art-19',
        code: 'Article 19',
        title: 'Substitution',
        diagram: 'signals-scoresheet',
        summary: 'Substitution opportunities, scorer’s table reporting, and mandatory free-throw shooter substitution rules.',
        clauses: [
          '19.1 A substitution is an interruption of the game requested by the substitute to become a player.',
          '19.2 A substitution opportunity begins when the ball becomes dead, the game clock is stopped, and the referee has ended communication with the table; or for the non-scoring team in the last 2 minutes of the 4th quarter / overtime when a field goal is scored.',
          '19.3 A player who has been substituted and a substitute who has become a player cannot respectively re-enter or leave the game until the ball becomes dead again after a clock-running phase of the game.',
        ],
      },
      {
        id: 'art-20',
        code: 'Article 20',
        title: 'Game lost by forfeit',
        summary: '20–0 win awarded and 0 classification points for failing to appear within 15 minutes or refusing to play.',
        clauses: [
          '20.1 A team shall lose the game by forfeit if: (a) The team is not present or is unable to field 5 players ready to play 15 minutes after the scheduled starting time; (b) Its actions prevent the game from being played; (c) It refuses to play after being instructed to do so by the crew chief.',
          '20.2 Penalty: The game is awarded to the opponents and the score shall be 20 to 0. Furthermore, the forfeiting team shall receive 0 points in the classification.',
        ],
      },
      {
        id: 'art-21',
        code: 'Article 21',
        title: 'Game lost by default',
        summary: 'Team reduced to fewer than 2 players on the court loses by default.',
        clauses: [
          '21.1 A team shall lose a game by default if, during the game, the team has fewer than 2 players on the playing court ready to play.',
          '21.2 Penalty: If the team to which the game is awarded is ahead, the score shall stand as at the time when the game was stopped. If not ahead, the score shall be 2 to 0 in its favour. The defaulting team receives 1 point in the classification.',
        ],
      },
    ],
  },
  {
    id: 'rule-5',
    number: 'RULE FIVE',
    title: 'Violations',
    subtitle: 'Articles 22–31 · Out-of-bounds, dribbling, travelling, time limits, backcourt, and goaltending',
    articles: [
      {
        id: 'art-22',
        code: 'Article 22',
        title: 'Violations',
        summary: 'An infraction of the rules; penalty awards the ball to opponents for a throw-in closest to the infraction.',
        clauses: [
          '22.1 A violation is an infraction of the rules.',
          '22.2 Penalty: The ball shall be awarded to the opponents for a throw-in at the place nearest to the infraction, except directly behind the backboard, unless otherwise stated in the rules.',
        ],
      },
      {
        id: 'art-23',
        code: 'Article 23',
        title: 'Player out-of-bounds and ball out-of-bounds',
        summary: 'Player is out-of-bounds when touching the floor or any object on, above, or outside a boundary line.',
        clauses: [
          '23.1 A player is out-of-bounds when any part of their body is in contact with the floor, or any object other than a player above, on or outside the boundary lines.',
          '23.2 The ball is out-of-bounds when it touches a player or any other person who is out-of-bounds, the floor or any object above, on or outside the boundary line, the backboard supports, or the back of the backboards.',
        ],
      },
      {
        id: 'art-24',
        code: 'Article 24',
        title: 'Dribbling',
        summary: 'A player shall not dribble a second time after their first dribble has ended unless they lose control.',
        badge2026: '2026 Updated',
        clauses: [
          '24.1 A dribble is the movement of a live ball caused by a player in control of that ball who throws, taps, rolls or bounces the ball on the floor.',
          '24.2 A player shall not dribble for a second time after their first dribble has ended unless between the 2 dribbles they have lost control of a live ball on the playing court because of: (a) A shot for a field goal; (b) A touch of the ball by an opponent; (c) A pass or fumble that has touched or been touched by another player.',
        ],
      },
      {
        id: 'art-25',
        code: 'Article 25',
        title: 'Travelling',
        summary: 'Illegal movement of one or both feet beyond the limits outlined while holding a live ball on the court.',
        clauses: [
          '25.1 Travelling is the illegal movement of one foot or both feet beyond the limits outlined in this article, in any direction, while holding a live ball on the playing court.',
          '25.2 Gather & Two-Step Progression: A player who catches the ball while progressing, or upon completion of a dribble, may take 2 steps in coming to a stop, passing or shooting the ball (gather step = step 0, followed by step 1 and step 2).',
          '25.3 Starting a dribble: The ball must be released from the player’s hand(s) before the pivot foot is lifted from the floor.',
          '25.4 Falling, lying or sitting on the floor: Legal when a player falls and slides on the floor while holding the ball; illegal if the player then rolls or attempts to stand up while holding the ball.',
        ],
      },
      {
        id: 'art-26',
        code: 'Article 26',
        title: '3 seconds',
        summary: 'Offensive player cannot remain in the opponents’ restricted area for more than 3 consecutive seconds while team has live ball control in frontcourt.',
        clauses: [
          '26.1 A player shall not remain in the opponents’ restricted area for more than 3 consecutive seconds while their team is in control of a live ball in the frontcourt and the game clock is running.',
          '26.2 Allowances must be made for a player who: (a) Makes an attempt to leave the restricted area; (b) Is in the restricted area when they or a teammate is in the act of shooting and the ball is leaving or has just left the player’s hand(s); (c) Dribbles in the restricted area to shoot for a field goal after having been there for less than 3 consecutive seconds.',
        ],
      },
      {
        id: 'art-27',
        code: 'Article 27',
        title: 'Closely guarded player',
        summary: 'A player holding a live ball while closely guarded (within 1 m) must pass, shoot, or dribble within 5 seconds.',
        clauses: [
          '27.1 A player who is holding a live ball on the playing court is closely guarded when an opponent is in an active legal guarding position at a distance of no more than 1 m.',
          '27.2 A closely guarded player must pass, shoot or dribble the ball within 5 seconds.',
        ],
      },
      {
        id: 'art-28',
        code: 'Article 28',
        title: '8 seconds',
        summary: 'Team gaining control of a live ball in its backcourt must cause the ball to go into its frontcourt within 8 seconds.',
        clauses: [
          '28.1 Whenever a player in the backcourt gains control of a live ball (or on a throw-in the ball touches/is legally touched by any player in the backcourt), that team must cause the ball to go into its frontcourt within 8 seconds.',
          '28.2 The ball has gone into a team’s frontcourt when: (a) The ball, not in control of any player, touches the frontcourt; (b) The ball touches or is legally touched by an offensive player who has both feet completely in contact with their frontcourt; (c) The ball touches or is legally touched by a defensive player who has part of their body in contact with their backcourt.',
        ],
      },
      {
        id: 'art-29',
        code: 'Article 29',
        title: 'Shot clock',
        summary: '24-second shot clock; 14-second reset after offensive rebound or frontcourt foul/violation.',
        clauses: [
          '29.1 Whenever a player gains control of a live ball on the playing court, a shot for a field goal must be made within 24 seconds (ball must leave hand(s) before signal sounds and subsequently touch the ring or enter the basket).',
          '29.2 14-second reset: When the shot clock is stopped with the game clock stopped for a foul or violation committed by the team not in control of the ball in the opponents’ backcourt, the shot clock is reset to 24 seconds. If the throw-in is administered in the frontcourt, the shot clock is reset to 14 seconds (or remains as is if 14 seconds or more are displayed).',
          '29.3 Offensive rebound: After the ball has touched the ring of the opponents’ basket, the shot clock shall be reset to 14 seconds if the team that regains control is the same team that was in control before the ball touched the ring.',
        ],
      },
      {
        id: 'art-30',
        code: 'Article 30',
        title: 'Ball returned to the backcourt',
        summary: 'Team in control of a live ball in its frontcourt may not cause the ball to be illegally returned to its backcourt.',
        clauses: [
          '30.1 A team is in control of a live ball in its frontcourt if a player of that team is touching their frontcourt with both feet while holding, catching or dribbling the ball in their frontcourt, or the ball is passed between players of that team in their frontcourt.',
          '30.2 The ball has been illegally returned to the backcourt when a player of the team in control of the live ball is the last to touch the ball in their frontcourt, after which that player or a teammate is the first to touch the ball in their backcourt.',
          '30.3 Exception: Does not apply to a player who jumps from their frontcourt, establishes new team control while still airborne, and then lands with the ball in their backcourt.',
        ],
      },
      {
        id: 'art-31',
        code: 'Article 31',
        title: 'Goaltending and basket interference',
        summary: 'Touching the ball on its downward flight completely above the level of the ring or interfering with the basket/backboard.',
        clauses: [
          '31.1 Goaltending occurs during a shot for a field goal when a player touches the ball while it is completely above the level of the ring and it is on its downward flight to the basket, or after it has touched the backboard.',
          '31.2 Basket interference occurs when a player touches the basket or backboard while the ball is in contact with the ring, reaches through the basket from below and touches the ball, or causes the backboard/ring to vibrate in a way that prevents/causes the ball to enter.',
          '31.3 Penalty: If committed by a defensive player, the shooter is awarded 2 or 3 points as if the ball had entered the basket. If committed by an offensive player, no points are awarded and the ball is awarded to opponents at the free-throw line extended.',
        ],
      },
    ],
  },
  {
    id: 'rule-6',
    number: 'RULE SIX',
    title: 'Fouls',
    subtitle: 'Articles 32–40 · Contact principles, personal, technical (Cat. 1 & 2), disruptive, flagrant, and disqualifying',
    articles: [
      {
        id: 'art-32',
        code: 'Article 32',
        title: 'Fouls',
        summary: 'An infraction of the rules concerning illegal personal contact with an opponent and/or unsportsmanlike behaviour.',
        clauses: [
          '32.1 A foul is an infraction of the rules concerning illegal personal contact with an opponent and/or unsportsmanlike behaviour.',
          '32.2 Any number of fouls may be called against a team. Irrespective of the penalty, each foul shall be charged, entered on the scoresheet against the offender, and penalised accordingly.',
        ],
      },
      {
        id: 'art-33',
        code: 'Article 33',
        title: 'Contact: General principles',
        summary: 'Cylinder principle, principle of verticality, legal guarding position, charging/blocking, and screening.',
        clauses: [
          '33.1 Cylinder principle: Defined as the space within an imaginary cylinder occupied by a player on the floor, including the space above the player, limited to the front by the palms, to the rear by the buttocks, and to the sides by the outer edge of the arms and legs.',
          '33.2 Principle of verticality: Each player has the right to occupy any floor position not already occupied by an opponent and the vertical space above it.',
          '33.3 Legal guarding position: A defensive player has established an initial legal guarding position when they face the opponent and have both feet on the floor.',
          '33.4 No-charge semi-circle: Offensive contact against a defensive player inside the no-charge semi-circle shall not be called as an offensive foul if the offensive player is airborne and attempting a shot or pass.',
          '33.5 Screening: Legal when the screener is stationary (inside their cylinder) and has both feet on the floor when contact occurs.',
        ],
      },
      {
        id: 'art-34',
        code: 'Article 34',
        title: 'Personal foul',
        summary: 'Illegal contact with an opponent whether the ball is live or dead (holding, pushing, charging, impeding, illegal use of hands).',
        clauses: [
          '34.1 A personal foul is a player’s illegal contact with an opponent, whether the ball is live or dead.',
          '34.2 Penalty if NOT in act of shooting: Throw-in for the non-offending team at the place nearest to the infraction (unless in the team foul penalty situation, which awards 2 free throws).',
          '34.3 Penalty if IN act of shooting: If goal is made, it counts plus 1 free throw. If goal is not made, 2 free throws (2-point zone) or 3 free throws (3-point zone).',
        ],
      },
      {
        id: 'art-35',
        code: 'Article 35',
        title: 'Double foul',
        summary: 'Two opponents commit personal or disruptive/flagrant fouls against each other at approximately the same time.',
        clauses: [
          '35.1 A double foul is a situation in which 2 opponents commit personal or disruptive/flagrant fouls against each other at approximately the same time.',
          '35.2 A personal foul shall be charged against each offender. No free throws are awarded; the game is resumed by a throw-in to the team that had control or was entitled to the ball when the double foul occurred (or alternating possession if neither had control).',
        ],
      },
      {
        id: 'art-36',
        code: 'Article 36',
        title: 'Technical foul',
        summary: 'Non-contact behavioural or administrative foul; split in 2026 into Category 1 (counts toward ejection) and Category 2 (administrative).',
        badge2026: '2026 New Categories',
        clauses: [
          '36.1 Conduct: Proper conduct of the game demands full and loyal cooperation of members of both teams with the referees, table officials and commissioner.',
          '36.2 Category 1 Technical Foul (T): Unsportsmanlike non-contact acts such as disrespecting/addressing officials, taunting/baiting an opponent, faking being fouled (flopping), or excessive swinging of elbows without contact. Counts toward game disqualification (2 Cat. 1 T’s or 1 Cat. 1 T + 1 Flagrant).',
          '36.3 Category 2 Technical Foul (T): Administrative or delay infractions such as hanging on the ring, delaying the game by preventing a prompt throw-in, or defensive goaltending on a last free throw. Does NOT count toward automatic game disqualification.',
          '36.4 Penalty: 1 free throw awarded to the opponents (any active player may shoot), followed by a throw-in for the team that had control or was entitled to the ball when the technical foul was called.',
        ],
      },
      {
        id: 'art-37',
        code: 'Article 37',
        title: 'Disruptive foul',
        summary: 'New 2026 foul category replacing tactical/transition fouls: illegal contact not making a legitimate play on the ball to break up flow or stop a fast break.',
        badge2026: 'New in 2026 (DI)',
        clauses: [
          '37.1 Definition: A disruptive foul (recorded as DI on the scoresheet) is a player contact foul which, in the judgement of a referee, is not a legitimate attempt to directly play the ball within the spirit and intent of the rules, and is committed to disrupt the flow of the game—such as stopping a fast break, stopping the clock at the end of a period, or contact from behind/side with no defender between the offensive player and the basket.',
          '37.2 Penalty: Free throw(s) awarded to the fouled player (2 free throws if not shooting; 1 additional free throw if a shot is made; 2 or 3 free throws if a shot misses), followed by a throw-in for the non-offending team at the throw-in line in its frontcourt.',
          '37.3 Note: Unlike a Flagrant Foul, 2 Disruptive Fouls do not trigger an automatic game disqualification unless the player reaches the 5-foul personal limit.',
        ],
      },
      {
        id: 'art-38',
        code: 'Article 38',
        title: 'Flagrant foul',
        summary: 'New 2026 category for excessive, reckless, violent, or dangerous illegal contact; 2 Flagrant fouls (or 1 Flagrant + 1 Cat. 1 Technical) ejects the player.',
        badge2026: 'New in 2026 (FL)',
        clauses: [
          '38.1 Definition: A flagrant foul (recorded as FL on the scoresheet) is a player contact foul which is against the spirit of sportsmanship and fair play, is not a legitimate basketball action, or involves excessive, hard, reckless, or dangerous contact (such as contact to the head/neck or undercutting an airborne player).',
          '38.2 Disqualification: A player shall be disqualified for the remainder of the game when charged with 2 flagrant fouls, or with 1 flagrant foul and 1 Category 1 technical foul.',
          '38.3 Penalty: Free throw(s) awarded to the fouled player (2 free throws if not shooting; 1 free throw if shot made; 2 or 3 free throws if shot misses), followed by a throw-in at the throw-in line in the frontcourt.',
        ],
      },
      {
        id: 'art-39',
        code: 'Article 39',
        title: 'Disqualifying foul',
        summary: 'Any flagrant unsportsmanlike action by players, substitutes, coaches, or accompanying delegation members.',
        clauses: [
          '39.1 A disqualifying foul (recorded as D) is any flagrant unsportsmanlike action by players, substitutes, head coaches, assistant coaches, excluded players and accompanying delegation members.',
          '39.2 A disqualified person shall go to and remain in their team’s dressing room for the duration of the game or, if they choose, leave the building.',
          '39.3 Penalty: 2 free throws awarded to the opponents followed by a throw-in at the throw-in line in the opponents’ frontcourt.',
        ],
      },
      {
        id: 'art-40',
        code: 'Article 40',
        title: 'Fighting',
        summary: 'Physical interaction between 2 or more persons; bench personnel leaving the bench area during a fight are disqualified.',
        clauses: [
          '40.1 Fighting is physical interaction between 2 or more persons (players, substitutes, head coaches, assistant coaches, excluded players and accompanying delegation members).',
          '40.2 Substitutes, excluded players, or accompanying delegation members who leave the team bench area during a fight or any situation which may lead to a fight shall be disqualified.',
          '40.3 Only the head coach and/or first assistant coach are permitted to leave the team bench area during a fight to assist the referees to maintain or restore order.',
        ],
      },
    ],
  },
  {
    id: 'rule-7',
    number: 'RULE SEVEN',
    title: 'General Provisions',
    subtitle: 'Articles 41–45 · Foul limits, team foul penalty, special situations, free throws, and correctable errors',
    articles: [
      {
        id: 'art-41',
        code: 'Article 41',
        title: 'Foul limits by a player/head coach and game disqualifications',
        summary: '5 fouls per player; head coach disqualified after 2 personal technicals (C) or 3 total bench technicals (C/B).',
        clauses: [
          '41.1 A player who has committed 5 fouls (personal, technical, disruptive, or flagrant) shall be informed by a referee and must leave the game immediately and be substituted within 30 seconds.',
          '41.2 A head coach shall be disqualified when charged with 2 technical fouls (‘C’) as a result of their personal unsportsmanlike behaviour, or 3 technical fouls accumulated (‘C’ or ‘B’) by the team bench area.',
        ],
      },
      {
        id: 'art-42',
        code: 'Article 42',
        title: 'Team fouls: Penalty',
        summary: 'From the 5th team foul in a quarter, all subsequent defensive personal fouls award 2 free throws.',
        clauses: [
          '42.1 A team foul is a personal, technical, disruptive, flagrant or disqualifying foul committed by a player. Any foul committed by a head coach or bench personnel is NOT a team foul.',
          '42.2 A team is in the team foul penalty situation after it has committed 4 team fouls in a quarter.',
          '42.3 When a team is in the team foul penalty situation, all subsequent player personal fouls committed on a player not in the act of shooting shall be penalised by 2 free throws instead of a throw-in. Fouls by the team in control of the live ball are penalised by a throw-in for the opponents.',
        ],
      },
      {
        id: 'art-43',
        code: 'Article 43',
        title: 'Special situations',
        summary: 'Equal penalties cancel out in the exact order in which the fouls were called during the same clock-stopped period.',
        clauses: [
          '43.1 In the same game clock stopped period after a foul or violation, special situations may arise when additional foul(s) are committed.',
          '43.2 All fouls shall be charged and all penalties identified. The order in which all fouls occurred shall be determined.',
          '43.3 Equal penalties against both teams and double foul penalties shall be cancelled in the order in which they were called. Once cancelled, they are considered as never having occurred.',
        ],
      },
      {
        id: 'art-44',
        code: 'Article 44',
        title: 'Free throws',
        summary: '5-second release limit, lane rebound positioning (max 3 defensive, 2 offensive), and free-throw violations.',
        clauses: [
          '44.1 When a personal, disruptive, flagrant or disqualifying foul is called, the free throw(s) shall be awarded to the fouled player.',
          '44.2 The free-throw shooter shall take a position behind the free-throw line and inside the semi-circle, and release the ball within 5 seconds after it is placed at their disposal by a referee.',
          '44.3 Rebound places along the restricted area: A maximum of 5 players (3 defensive and 2 offensive) may occupy the marked rebound spaces. Players may not enter the restricted area until the ball has left the hand(s) of the free-throw shooter.',
        ],
      },
      {
        id: 'art-45',
        code: 'Article 45',
        title: 'Correctable errors',
        summary: 'Errors involving unmerited/omitted free throws, wrong shooter, or erroneously awarded/cancelled points.',
        clauses: [
          '45.1 Referees may correct an error if a rule is inadvertently disregarded in: (a) Awarding an unmerited free throw(s); (b) Failing to award a merited free throw(s); (c) Erroneously awarding or cancelling a point(s); (d) Permitting the wrong player to attempt a free throw(s).',
          '45.2 General procedure: To be correctable, the error must be recognised by the referees, commissioner, or table officials before the ball becomes live following the first dead ball after the game clock has started following the error.',
        ],
      },
    ],
  },
  {
    id: 'rule-8',
    number: 'RULE EIGHT',
    title: 'Referees, Table Officials, Commissioner',
    subtitle: 'Articles 46–51 · Duties and powers of on-court officials and the scorer’s table',
    articles: [
      {
        id: 'art-46',
        code: 'Article 46',
        title: 'Referees, table officials and commissioner',
        summary: 'Crew chief, 1 or 2 umpires, assisted by scorer, assistant scorer, timer, and shot clock operator.',
        diagram: 'table-officials',
        clauses: [
          '46.1 The referees shall be a crew chief and 1 or 2 umpire(s). They shall be assisted by the table officials (scorer, assistant scorer, timer, and shot clock operator) and by a commissioner, if present.',
          '46.2 Table seating order (left to right facing court): Assistant Scorer, Scorer, Commissioner (if present), Timer, Shot Clock Operator.',
        ],
      },
      {
        id: 'art-47',
        code: 'Article 47',
        title: 'Crew chief: Duties and powers',
        summary: 'Inspects and approves all equipment, designates the official game clock, and makes the final decision on protests or disagreements.',
        clauses: [
          '47.1 Inspect and approve all equipment to be used during the game.',
          '47.2 Designate the official game clock, shot clock, stopwatch, and recognise the table officials.',
          '47.3 Make the final decision whenever necessary or when the referees disagree, and examine and sign the scoresheet at the end of playing time.',
        ],
      },
      {
        id: 'art-48',
        code: 'Article 48',
        title: 'Referees: Duties and powers',
        summary: 'Authority to make decisions on infractions within or outside boundary lines, administer penalties, and blow the whistle.',
        clauses: [
          '48.1 The referees shall have the power to make decisions on infractions of the rules committed either within or outside the boundary line including the scorer’s table, the team benches, and the areas immediately behind the lines.',
          '48.2 Referees shall blow their whistles when an infraction of the rules occurs, a quarter or overtime ends, or they find it necessary to stop the game.',
        ],
      },
      {
        id: 'art-49',
        code: 'Article 49',
        title: 'Scorer and assistant scorer: Duties',
        summary: 'Maintains running summary of points, records fouls, notifies referees on 5th player foul and 4th team foul, and manages alternating possession arrow.',
        clauses: [
          '49.1 The scorer shall record names/numbers of players, keep a chronological running summary of points scored, record all fouls charged, and notify a referee immediately when a player commits their 5th foul or a head coach is disqualified.',
          '49.2 Raise the team foul marker once 4 team fouls are reached in a quarter, and effect substitutions and time-outs.',
          '49.3 The assistant scorer shall operate the scoreboard and assist the scorer.',
        ],
      },
      {
        id: 'art-50',
        code: 'Article 50',
        title: 'Timer: Duties',
        summary: 'Measures playing time, time-outs (sounding warning at 50s and end at 60s), and intervals of play.',
        clauses: [
          '50.1 Start the game clock when the ball is legally tapped on a jump ball, touches/is touched on a throw-in, or on a missed last free throw when the ball touches/is touched by a player on the court.',
          '50.2 Stop the game clock when time expires at the end of a quarter/overtime, a referee blows the whistle while the ball is live, a field goal is scored against a team that has requested a time-out, or a field goal is scored in the last 2 minutes of the 4th quarter or overtime.',
          '50.3 Time-outs: Start stopwatch on referee’s signal, sound signal at 50 seconds elapsed, and sound signal at 60 seconds when time-out ends.',
        ],
      },
      {
        id: 'art-51',
        code: 'Article 51',
        title: 'Shot clock operator: Duties',
        summary: 'Operates 24s / 14s shot clock display and sounds signal when shot clock expires.',
        clauses: [
          '51.1 Start or continue the shot clock whenever a team gains control of a live ball on the playing court (or on a throw-in when the ball touches or is legally touched by any player on the court).',
          '51.2 Stop, but NOT reset (displaying remaining time), when the same team that previously had control is awarded a throw-in due to out-of-bounds, injured player, jump ball situation, or double foul.',
          '51.3 Stop and reset to 24 seconds (or 14 seconds on frontcourt throw-in / offensive rebound after ring contact) in accordance with Article 29.',
          '51.4 Switch off the shot clock display once the ball becomes dead and the game clock has been stopped in any quarter or overtime when there are fewer than 24 seconds (or 14 seconds) remaining on the game clock.',
        ],
      },
    ],
  },
  {
    id: 'appendices',
    number: 'APPENDICES A–F',
    title: 'Official Appendices',
    subtitle: 'Signals, Scoresheet (2026 Markings), Protest, Team Classification, Media Time-outs & IRS',
    articles: [
      {
        id: 'app-a',
        code: 'Appendix A',
        title: 'Referees’ Signals',
        summary: 'Standardised FIBA hand signals for game clock, scoring, substitutions, time-outs, violations, and fouls.',
        badge2026: '2026 Updated',
        diagram: 'signals-scoresheet',
        clauses: [
          'Game Clock: Stop clock (open palm raised); Stop clock for foul (clenched fist raised); Start clock (chop with hand).',
          'Scoring: 1 point (1 finger, flag from wrist); 2 points (2 fingers, flag from wrist); 3 points attempt (3 fingers extended one arm) / successful (both arms raised); Cancel score (scissor-like action once across chest).',
          'Violations: Travelling (rotate fists); Illegal dribble (patting motion); Carrying (half rotation forward); 3 seconds (arm extended showing 3 fingers); 5 seconds (show 5 fingers); 8 seconds (show 8 fingers); 24 seconds (fingers touch shoulder); Ball returned to backcourt (wave arm front of body); Deliberate foot ball (point finger to foot).',
          'Fouls & Administration: Personal foul (clenched fist); Technical foul (form ‘T’ showing palms); Disruptive foul (grasp wrist upward); Flagrant foul (crossed wrists overhead); Disqualifying foul (clenched fists both hands overhead).',
        ],
      },
      {
        id: 'app-b',
        code: 'Appendix B',
        title: 'The Scoresheet',
        summary: 'Official FIBA scoresheet layout, colour coding (blue/black for Q1 & Q3; red for Q2, Q4 & OT), and 2026 foul symbols.',
        badge2026: '2026 New Markings',
        diagram: 'signals-scoresheet',
        clauses: [
          'Pen Colours: Blue or black ink for 1st and 3rd quarters; red ink for 2nd and 4th quarters and all overtimes.',
          'Player Foul Symbols (2026): P = Personal foul; T = Technical foul (Cat. 1 or Cat. 2); DI = Disruptive foul; FL = Flagrant foul; D = Disqualifying foul.',
          'Coach & Bench Foul Symbols: C = Technical foul to head coach for personal unsportsmanlike behaviour; B = Technical foul for any other bench reason; BD = Disqualifying foul to accompanying delegation member.',
          'Free-Throw Suffixes: Add ‘1’, ‘2’, or ‘3’ next to the foul code to denote the number of free throws awarded (e.g., P2, DI2, FL2, T1).',
        ],
      },
      {
        id: 'app-c',
        code: 'Appendix C',
        title: 'Protest Procedure',
        summary: 'Captain signs scoresheet within 15 minutes of game end; written reasons submitted within 1 hour.',
        clauses: [
          'C.1 A team may file a protest if its interests have been adversely affected by: (a) An error in scorekeeping, timekeeping or shot clock operation not corrected by the referees; (b) A decision to forfeit, cancel, postpone, not resume or not play the game; (c) A violation of the applicable eligibility rules.',
          'C.2 The captain shall sign the scoresheet in the ‘Captain’s signature in case of protest’ box no later than 15 minutes after the end of the game, and the team must submit written reasons within 1 hour.',
        ],
      },
      {
        id: 'app-d',
        code: 'Appendix D',
        title: 'Classification of Teams',
        summary: '2 points for a win, 1 point for a loss (including default), 0 points for a forfeit; head-to-head tie-breaker cascade.',
        badge2026: '2026 Updated',
        clauses: [
          'D.1 Classification points: Win = 2 points; Loss = 1 point; Game lost by forfeit = 0 points.',
          'D.2 Two-team tie-breaker: (1) Higher game points in games between the two teams; (2) Higher goal difference in games between the two teams; (3) Higher number of points scored in games between the two teams; (4) Higher goal difference in all group games; (5) Higher number of points scored in all group games.',
          'D.3 Three-or-more-team tie-breaker: Second classification established taking into account only the games between the tied teams, repeating the cascade until all ties are resolved.',
        ],
      },
      {
        id: 'app-e',
        code: 'Appendix E',
        title: 'Media Time-outs',
        summary: 'Optional 60/75/90/100-second television media time-out rules for broadcast competitions.',
        clauses: [
          'E.1 Organising bodies may decide whether media time-outs shall be applied and their duration (60, 75, 90 or 100 seconds).',
          'E.2 One media time-out is permitted in each quarter in addition to regular team time-outs, granted at the first dead ball when the game clock shows 5:00 minutes or less in the quarter (provided neither team has already taken a time-out in that quarter).',
        ],
      },
      {
        id: 'app-f',
        code: 'Appendix F',
        title: 'Instant Replay System (IRS)',
        summary: 'Reviewable game situations (end-of-period buzzer beaters, 2pt vs 3pt shots, foul upgrades/downgrades, and Head Coach Challenge).',
        badge2026: '2026 Updated',
        clauses: [
          'F.1 IRS review may be used by referees to verify end-of-quarter/overtime shots, 2-point vs 3-point field goals, shot clock violations, foul severity (Personal vs Disruptive vs Flagrant vs Disqualifying), identification of correct free-throw shooter, and clock malfunctions.',
          'F.2 Head Coach’s Challenge (HCC): Each head coach is granted 1 challenge per game to request an IRS review of a reviewable situation. If successful, the coach retains 1 challenge for the remainder of the game (maximum 1 challenge retained).',
        ],
      },
    ],
  },
];